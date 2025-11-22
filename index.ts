/**
 * Realboard - HydroOJ 实时滚榜插件
 * 
 * 本项目基于 Hydro 官方 onsite-toolkit 开发
 * 原始项目: https://github.com/hydro-dev/Hydro/tree/master/packages/onsite-toolkit
 * 许可证: GNU Affero General Public License v3.0 (AGPL-3.0)
 * 
 * Copyright (c) 2025 HandsomeRun
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import moment from 'moment';
import {
    avatar, ContestModel, Context, db, findFileSync,
    ForbiddenError, fs, ObjectId, parseTimeMS, PERM, ProblemConfig, ProblemModel,
    STATUS, STATUS_SHORT_TEXTS, STATUS_TEXTS, Time, UserModel, Zip,
    Logger, ConnectionHandler, param, Types, subscribe,server,router
} from 'hydrooj';
import _ from 'lodash'; // 导入 lodash  
import { ResolverInput } from './interface';

const logger = new Logger('realboard');
// 房间连接表
const rooms: Map<string, Set<any>> = new Map();

// 使用外部 Map 保存房间连接
export function apply(ctx: Context) {  
    ctx.inject(['scoreboard'], ({ scoreboard }) => {  
        scoreboard.addView('realboard', 'Realboard', { tdoc: 'tdoc' }, {  
            async display({ tdoc }) {  
                logger.info('realboard: display tdoc', { tdoc: tdoc, _id: tdoc._id, docId: tdoc.docId });    
  
                logger.info('realboard: 生成实时榜单数据');  
                if (!this.user.own(tdoc) && ContestModel.isLocked(tdoc)) this.checkPerm(PERM.PERM_VIEW_CONTEST_HIDDEN_SCOREBOARD);  
                const teams = await ContestModel.getMultiStatus(tdoc.domainId, { docId: tdoc.docId }).toArray();  
                const udict = await UserModel.getList(tdoc.domainId, teams.map((i) => i.uid));  
                const teamIds: Record<number, number> = {};  
                for (let i = 1; i <= teams.length; i++) teamIds[teams[i - 1].uid] = i;  
                const time = (t: ObjectId) => Math.floor((t.getTimestamp().getTime() - tdoc.beginAt.getTime()) / Time.second);  
                const pid = (i: number) => String.fromCharCode(65 + i);  
                const unknownSchool = this.translate('Unknown School');  
                const submissions = teams.flatMap((i) => {  
                    if (!i.journal) return [];  
                    return i.journal.filter((s) => tdoc.pids.includes(s.pid)).map((s) => ({ ...s, uid: i.uid }));  
                });  
                const submissionData = submissions.map((i) => ({  
                    team: i.uid.toString(),  
                    problem: i.pid.toString(),  
                    verdict: STATUS_SHORT_TEXTS[i.status],  
                    score: i.score || 0,
                    time: time(i.rid),  
                }));  
                  
                // 设置响应数据，将 tdoc 作为顶级属性传递  
                this.response.body = {  
                    page_name: 'realboard',  
                    tdoc: tdoc, // <-- 添加这一行，直接传递 tdoc 对象  
                    payload: {  
                        name: tdoc.title,  
                        rule: tdoc.rule,
                        duration: Math.floor((new Date(tdoc.endAt).getTime() - new Date(tdoc.beginAt).getTime()) / 1000),  
                        frozen: Math.floor((new Date(tdoc.lockAt).getTime() - new Date(tdoc.beginAt).getTime()) / 1000),
                        penalty: tdoc.rule?.penalty || 20,
                        problems: tdoc.pids.map((i, n) => ({ name: pid(n), id: i.toString() })),  
                        teams: teams.map((t) => ({  
                            id: t.uid.toString(),  
                            name: udict[t.uid].displayName || udict[t.uid].uname,  
                            avatar: avatar(udict[t.uid].avatar),  
                            institution: udict[t.uid].school || unknownSchool,  
                            exclude: t.unrank,  
                        })),  
                        submissions: submissionData,  
                    } as ResolverInput,  
                };  
                this.response.template = 'realboard.html';  

                logger.info('display 执行完毕');
            },  
            supportedRules: ['acm', 'oi', 'ioi', 'leduo', 'icpc'],  
        });  
    });  

    // WebSocket连接处理器
    class RealboardConnectionHandler extends ConnectionHandler {
        cid: string;
        tdoc: ContestModel;
        queue: Map<string, () => Promise<any>> = new Map();
        throttleQueueClear: () => void;

        @param('cid', Types.String)
        async prepare(domainId: string, cid: string) {
            logger.info('realboard: prepare 开始', {  
                domainId,  
                cid,  
                userId: this.user?._id, // 检查用户ID  
                userExists: !!this.user // 检查用户对象是否存在  
                // isOwnerCheck: this.user?.own(this.tdoc) // 尝试调用 own 方法，但要确保 this.user 存在  
            });  


            try {  
            // logger.info('realboard: prepare 开始', { domainId, cid, user: this.user._id, isOwner: this.user.own(this.tdoc) });    
                
                if (!cid || cid === 'undefined') {    
                    logger.error('realboard: cid参数无效', { cid, args: (this as any).args });    
                    throw new ForbiddenError('Invalid cid parameter');    
                }    
                
                let foundTdoc = null;  
                if (ObjectId.isValid(cid)) {  
                    logger.info('验证 cid' , {cid}) ; 


                    foundTdoc = await ContestModel.get(domainId, new ObjectId(cid));  
                } else if (/^\d+$/.test(cid)) {  
                    logger.info('验证 cid 的else' , {cid}) ; 

                    const doc = await db.collection('document').findOne({  
                        domainId,  
                        docType: 30, // TYPE_CONTEST  
                        docId: Number(cid),  
                    });  
                    if (doc?._id) {  
                        foundTdoc = await ContestModel.get(domainId, doc._id);  
                    }  
                }  
                this.tdoc = foundTdoc; // 赋值给实例属性  
                logger.info('realboard: 比赛查找结果', { tdocFound: !!this.tdoc, domainId, cid });  
    
                if (!this.tdoc) {  
                    logger.error('realboard: 比赛未找到', { cid, domainId });  
                    throw new ForbiddenError('Contest not found');  
                }  
                
                // 权限检查  
                // 确保 this.user 存在  
                if (!this.user) {    
                    logger.error('realboard: 用户对象未加载', { userId: this.user?._id });    
                    throw new ForbiddenError('User object not loaded');    
                }  
                    
                
                if (!this.user.own(this.tdoc) && ContestModel.isLocked(this.tdoc)) {  
                    (this as any).checkPerm(PERM.PERM_VIEW_CONTEST_HIDDEN_SCOREBOARD);  
                }  


                const hasPerm = this.user.own(this.tdoc) || !ContestModel.isLocked(this.tdoc) || this.user.hasPerm(PERM.PERM_VIEW_CONTEST_HIDDEN_SCOREBOARD);  
                logger.info('realboard: 权限检查结果', { hasPerm, isOwner: this.user.own(this.tdoc), isLocked: ContestModel.isLocked(this.tdoc) });  
                if (!hasPerm) {  
                    throw new ForbiddenError('Permission denied to view hidden scoreboard');  
                }  
                
                if (!this.tdoc.beginAt) {  
                    logger.error('realboard: 比赛配置错误: 缺少开始时间', { cid, domainId });  
                    throw new ForbiddenError('Contest misconfiguration: missing start time');  
                }  
                
                this.cid = cid;  
                this.throttleQueueClear = _.throttle(this.queueClear, 100, { trailing: true });    
                
                await this.sendInitialData();  
                
                logger.info('realboard: 连接准备完成', { cid: this.cid });  
            } catch (e) {  
                logger.error('realboard: prepare 错误', { error: e, cid, args: (this as any).args });    
                throw e;    
            }  
        }

        async sendInitialData() {
            try {
                // 只发送一个简单的连接确认消息
                this.queueSend('initial', async () => ({ 
                    type: 'initial', 
                    data: {
                        message: 'Connected to realboard',
                        timestamp: Date.now()
                    }
                }));
                
                logger.info('realboard: 初始数据发送完成');
            } catch (e) {
                logger.error('realboard: 发送初始数据失败', { error: e });
            }
        }

        processSubmissions(teams: any[]) {
            const time = (t: ObjectId) => Math.floor((t.getTimestamp().getTime() - this.tdoc.beginAt.getTime()) / Time.second);
            const submissions = teams.flatMap((i) => {
                if (!i.journal) return [];
                return i.journal.filter((s) => this.tdoc.pids.includes(s.pid)).map((s) => ({ ...s, uid: i.uid }));
            });
            
            return submissions.map((i) => ({
                id: `${i.uid}-${i.pid}-${i.rid}`,
                team: i.uid.toString(),
                problem: i.pid.toString(),
                verdict: STATUS_SHORT_TEXTS[i.status],
                score: i.score || 0,
                time: time(i.rid),
            }));
        }

        @subscribe('record/change')
        async onRecordChange(rdoc: any) {
            try {
                if (!rdoc.contest || rdoc.contest.toString() !== this.cid) return;
                
                const submission = this.formatSubmission(rdoc);
                this.queueSend(submission.id, async () => ({ 
                    type: 'update', 
                    data: submission 
                }));
                
                logger.info('realboard: 记录变更推送', { submission });
            } catch (e) {
                logger.error('realboard: 处理记录变更失败', { error: e });
            }
        }

        formatSubmission(rdoc: any) {
            return {
                id: `${rdoc.uid}-${rdoc.pid}-${rdoc._id}`,
                team: rdoc.uid.toString(),
                problem: rdoc.pid.toString(),
                verdict: STATUS_SHORT_TEXTS[rdoc.status],
                score: rdoc.score || 0,
                time: Math.floor((new Date(rdoc._id.getTimestamp()).getTime() - new Date(this.tdoc.beginAt).getTime()) / 1000) || 0,
            };
        }

        queueSend(id: string, fn: () => Promise<any>) {
            this.queue.set(id, fn);
            this.throttleQueueClear();
        }

        async queueClear() {
            try {
                await Promise.all([...this.queue.values()].map(async (fn) => (this as any).send(await fn())));
                this.queue.clear();
            } catch (e) {
                logger.error('realboard: 队列清理失败', { error: e });
            }
        }

        async onerror(err: Error) {
            logger.error('realboard: 连接错误', { error: err, cid: this.cid });
        }

        async cleanup() {
            try {
                this.queue.clear();
                logger.info('realboard: 连接清理完成', { cid: this.cid });
            } catch (e) {
                logger.error('realboard: 连接清理失败', { error: e });
            }
        }
    }

    // 注册WebSocket连接 - 使用简化的路径
    ctx.Connection('realboard_conn', '/realboard-conn', RealboardConnectionHandler);
    
} 
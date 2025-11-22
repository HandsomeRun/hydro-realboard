/**
 * Realboard - HydroOJ 实时滚榜插件前端组件
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

import { addPage, NamedPage, React, ReactDOM } from '@hydrooj/ui-default';
import { animated, easings, useSprings, useTransition } from '@react-spring/web';
import { ResolverInput } from '../interface';

declare const $: any;

const MAX_QUEUE = 9;
const FADEOUT_TIME = 5000; // ms

// 共享的状态管理
const sharedState = {
  onBStageAppear: null as ((submissionId: string) => void) | null,
  setOnBStageAppear: (callback: (submissionId: string) => void) => {
    sharedState.onBStageAppear = callback;
  }
};

const isACM = (rule: string) => ['acm', 'icpc'].includes(rule?.toLowerCase() || 'acm');

function status(problem, rule: string, verdict?: string) {
  if (!problem) return 'untouched';
  if (problem.frozen) return 'frozen';
  if (problem.pass) return 'ac';
  if (isACM(rule)) {
    if (!problem.old) return 'untouched';
    if (verdict) {
        if (/^(ce|se|ign)/i.test(verdict)) return 'ce';
        if (/^(tle|mle)/i.test(verdict)) return 'tle';
        if (/^re/i.test(verdict)) return 're';
    }
    return 'failed';
  } else {
    if (!problem.touched) return 'untouched';
    if (verdict) {
        if (/^(ce|se|ign)/i.test(verdict)) return 'ce';
        if (/^(tle|mle)/i.test(verdict)) return 'tle';
        if (/^re/i.test(verdict)) return 're';
    }
    return 'failed'; // partial or 0
  }
}

function submissions(problem, rule: string, verdict?: string) {
  const st = status(problem, rule, verdict);
  if (st === 'frozen') { return `${problem.old}+${problem.frozen}`; }
  
  if (isACM(rule)) {
    if (st === 'ac') { return `${problem.old} / ${problem.time}`; }
    if (['failed', 'ce', 'tle', 're'].includes(st)) { return problem.old; }
    return String.fromCharCode('A'.charCodeAt(0) + problem.index);
  } else {
    if (st === 'untouched') return String.fromCharCode('A'.charCodeAt(0) + problem.index);
    return problem.score;
  }
}

function processRank(teams, rule: string) {
  const acm = isACM(rule);
  const clone = [...teams];
  clone.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // score/solved desc
    if (acm) {
        if (a.penalty !== b.penalty) return a.penalty - b.penalty; // penalty asc
    }
    return 0; 
  });
  let rank = 1;
  for (let i = 0; i < clone.length; i++) {
    const team = clone[i];
    if (team.exclude) {
      team.rank = -1;
      continue;
    }
    if (i > 0 && clone[i].score === clone[i - 1].score && (acm ? clone[i].penalty === clone[i - 1].penalty : true)) {
      team.rank = clone[i - 1].rank; // 并列
    } else {
      team.rank = rank;
    }
    rank++;
  }
}

function TeamItem({ team, style, data, ...props }) {
  const teamInfo = data.teams.find((idx) => idx.id === team.id);
  const [blinkState, setBlinkState] = React.useState(false);
  
  // 闪烁效果
  React.useEffect(() => {
    if (team.isPending) {
      const interval = setInterval(() => {
        setBlinkState(prev => !prev);
      }, 500); // 每500ms闪烁一次
      return () => clearInterval(interval);
    }
  }, [team.isPending]);
  
  // 获取题目状态样式
  const getProblemStatus = (problemId) => {
    const problemStatus = team.problems.find((idx) => idx.id === problemId);
    
    // 如果是当前提交的题目
    if (problemId === team.submissionProblem) {
      if (team.isPending) {
        // A阶段：待测评状态，闪烁
        return {
          className: `pnd item ${blinkState ? 'blink' : ''}`,
          text: 'PND'
        };
      } else {
        // B阶段：显示最终结果
        if (team.submissionVerdict === 'FROZEN') {
          return {
            className: 'frozen item',
            text: 'FROZEN',
          };
        }
        if (team.isRepeatedAC) {
          // 重复提交已AC题目：显示AC结果，但保持原有样式
          return {
            className: `ac item`,
            text: isACM(data.rule) ? 'AC' : team.submissionScore || 'AC'
          };
        } else {
          // 正常提交：显示实际结果
          const verdictStatus = status(problemStatus, data.rule, team.submissionVerdict);
          return {
            className: `${verdictStatus} item`,
            text: isACM(data.rule) ? team.submissionVerdict : (team.submissionScore ?? team.submissionVerdict)
          };
        }
      }
    }
    
    // 其他题目显示正常状态
    const baseStatus = status(problemStatus, data.rule, problemStatus.verdict);
    return {
      className: `${baseStatus} item`,
      text: submissions(problemStatus, data.rule, problemStatus.verdict)
    };
  };
  
  return <animated.div
    className={`rank-list-item clearfix ${props.className || ''}`}
    style={style}
  >
    <div className="rank">{team.rank === -1 ? '⭐' : team.rank}</div>
    <img className="avatar" src={teamInfo?.avatar} />
    <div className="content">
      <div className="name">{teamInfo?.institution} - {teamInfo?.name}</div>
      <div className="problems">
        {data.problems.map((v) => {
          const problemInfo = getProblemStatus(v.id);
          return <span key={v.id} className={problemInfo.className}>
            {problemInfo.text}
          </span>;
        })}
      </div>
    </div>
    <div className="solved">{team.score}</div>
    <div className="penalty" style={{ display: isACM(data.rule) ? '' : 'none' }}>{team.penalty}</div>
  </animated.div>;
}

function RealboardMain({ data, initialTeams }) {
  const baseTeams = React.useMemo(() => initialTeams.map((v) => ({ ...v })), [initialTeams]);
  const [bStageQueue, setBStageQueue] = React.useState([]);
  const [singleStageQueue, setSingleStageQueue] = React.useState([]);
  const [pendingAQueue, setPendingAQueue] = React.useState([]);
  const [allTeams, setAllTeams] = React.useState(baseTeams);
  const [connectionStatus, setConnectionStatus] = React.useState('connecting');
  const [processedSubmissions, setProcessedSubmissions] = React.useState(new Set());

  const shouldShowSubmission = React.useCallback((submission, processedSet) => {
    const submissionId = submission.id;
    const verdict = submission.verdict;
    const key = `${submissionId}-${verdict}`;
    return !processedSet.has(key);
  }, []);

  const updateTeamsWithSubmission = React.useCallback((teams, sub) => {
    // This is a pure function, it returns a new state
    const t = teams.map((team) => ({ ...team, problems: team.problems.map((p) => ({ ...p })) }));
    const team = t.find((v) => v.id === sub.team);
    if (!team) return t;
    
    const problem = team.problems.find((p) => p.id === sub.problem);
    if (problem?.pass && isACM(data.rule)) return t; // ACM mode: ignore if already passed
    
    team.total++;
    
    if (data.frozen > 0 && data.frozen < data.duration && sub.time > data.frozen) {
      problem.frozen = (problem.frozen || 0) + 1;
    } else {
      // Update verdict for display
      problem.verdict = sub.verdict;
      
      if (isACM(data.rule)) {
          if (sub.verdict === 'AC') {
            problem.pass = true;
            problem.time = Math.floor(sub.time / 60);
            team.score += 1;
            team.penalty += Math.floor(sub.time / 60) + problem.old * (data.penalty || 20);
          }
      } else {
          // OI / Score based
          const newScore = sub.score || 0;
          const oldScore = problem.score || 0;
          if (newScore > oldScore) {
              team.score += (newScore - oldScore);
              problem.score = newScore;
              if (newScore >= 100 || sub.verdict === 'AC') problem.pass = true;
          }
          problem.touched = true;
      }
      problem.old += 1;
    }
    
    processRank(t, data.rule);
    return t;
  }, [data.frozen, data.rule]);

  const createDisplayItem = React.useCallback((sub) => {
    const team = allTeams.find((v) => v.id === sub.team);
    if (!team) return null;
    
    const problem = team.problems.find((p) => p.id === sub.problem);
    let isRepeatedAC = false;
    if (isACM(data.rule)) {
        isRepeatedAC = problem && problem.pass && sub.verdict === 'AC';
    } else {
        // For OI, if score is not higher, maybe treat as repeated?
        // Or if score is already 100.
        isRepeatedAC = (problem && problem.score >= 100 && sub.score >= 100) || (problem.score >= sub.score);
    }
    
    const isPending = sub.verdict === undefined;
    const isFrozenSubmission = data.frozen > 0 && data.frozen < data.duration && sub.time > data.frozen;

    const newItem = {  
      ...team, 
      fade: false, 
      fadeKey: Math.random(),
      createdAt: Date.now(),
      submissionId: sub.id,
      submissionProblem: sub.problem,
      submissionVerdict: isFrozenSubmission ? 'FROZEN' : sub.verdict,
      submissionScore: sub.score,
      isPending,
      isFinal: !isPending,
      stage: isPending ? 'A' : 'B',
      isRepeatedAC,
    };
    
    newItem.problems = team.problems.map(p => ({ ...p }));

    if (!isPending && !isFrozenSubmission) {
      const updatedTeamState = updateTeamsWithSubmission(allTeams, sub);
      const updatedTeam = updatedTeamState.find(t => t.id === sub.team);
      if (updatedTeam) {
          Object.assign(newItem, {
              rank: updatedTeam.rank,
              score: updatedTeam.score,
              penalty: updatedTeam.penalty,
              problems: updatedTeam.problems,
              total: updatedTeam.total,
          });
      }
    } else {
        newItem.score = team.score;
        newItem.penalty = team.penalty;
        newItem.rank = team.rank;
        newItem.total = team.total;
    }
    
    return newItem;
  }, [allTeams, data.frozen, data.rule, updateTeamsWithSubmission]);

  const handleWebSocketMessage = React.useCallback((msg) => {
    if (msg.type !== 'update') return;

    const sub = msg.data;
    const key = `${sub.id}-${sub.verdict}`;

    setProcessedSubmissions(prev => {
        if (prev.has(key)) return prev;

        if (sub.verdict !== undefined) { // Stage B
            const newItem = createDisplayItem(sub);
            if (newItem) {
                setAllTeams(teams => updateTeamsWithSubmission(teams, sub));
                setBStageQueue(q => [...q, newItem].slice(-MAX_QUEUE));
                setSingleStageQueue(q => q.filter(item => item.submissionId !== sub.id));
                setPendingAQueue(q => q.filter(item => item.submissionId !== sub.id));
            }
        } else { // Stage A
            const newItem = createDisplayItem(sub);
            if (newItem) {
                setPendingAQueue(q => [...q, newItem]);
            }
        }
        return new Set(prev).add(key);
    });
  }, [createDisplayItem, updateTeamsWithSubmission]);

  React.useEffect(() => {
    const UiContext = (window as any).UiContext;
    if (!UiContext?.socketUrl) {
      console.error('realboard: 未找到socketUrl');
      setConnectionStatus('error');
      return;
    }

    let sock;
    async function initWebSocket() {
      try {
        const { Socket } = await import('@hydrooj/ui-default');
        sock = new Socket(UiContext.ws_prefix + UiContext.socketUrl, false, true);
        sock.on('open', () => setConnectionStatus('connected'));
        sock.on('close', () => setConnectionStatus('disconnected'));
        sock.on('message', (_, data) => {
          try {
            handleWebSocketMessage(JSON.parse(data));
          } catch (e) {
            console.error('realboard: 解析消息失败', e);
          }
        });
      } catch (e) {
        console.error('realboard: 初始化WebSocket失败', e);
        setConnectionStatus('error');
      }
    }

    initWebSocket();

    return () => {
      sock?.close();
    };
  }, [handleWebSocketMessage]);

  React.useEffect(() => {
    if (pendingAQueue.length > 0 && singleStageQueue.length === 0) {
      const [nextItem, ...remaining] = pendingAQueue;
      setSingleStageQueue([nextItem]);
      setPendingAQueue(remaining);
    }
  }, [pendingAQueue, singleStageQueue]);
  
  React.useEffect(() => {
    if (singleStageQueue.length === 0) return;
    const timer = setTimeout(() => {
        setSingleStageQueue([]);
    }, FADEOUT_TIME);
    return () => clearTimeout(timer);
  }, [singleStageQueue]);
  
  React.useEffect(() => {
    if (bStageQueue.length === 0) return;
    const timer = setTimeout(() => {
        const now = Date.now();
        setBStageQueue(q => q.filter(item => now - item.createdAt < FADEOUT_TIME));
    }, 1000);
    return () => clearTimeout(timer);
  }, [bStageQueue]);
  
  const bTransitions = useTransition(bStageQueue, {
    keys: item => item.fadeKey,
    from: { y: 720, opacity: 0 },
    enter: (item) => ({ y: bStageQueue.findIndex(i => i.fadeKey === item.fadeKey) * 80, opacity: 1 }),
    update: (item) => ({ y: bStageQueue.findIndex(i => i.fadeKey === item.fadeKey) * 80 }),
    leave: { opacity: 0 },
    config: { duration: 500, easing: easings.easeInOutCubic },
  });
  
  const [sSprings, sApi] = useSprings(singleStageQueue.length, () => ({
      y: 0, opacity: 1
  }), [singleStageQueue.length]);
  
  React.useEffect(() => {
    sApi.start({ opacity: 1, y: 0 });
  }, [singleStageQueue, sApi]);

  return (
    <>
      <div className="rank-list-b-stage">
        {bTransitions((style, item, t, i) => 
          item && <TeamItem 
            key={item.fadeKey} 
            team={item} 
            style={style} 
            data={data}
            className={i % 2 === 0 ? 'even' : 'odd'}
          />
        )}
      </div>
      <div className="rank-list-single">
        {sSprings.map((style, i) => (
          singleStageQueue[i] && <TeamItem key={singleStageQueue[i].fadeKey} team={singleStageQueue[i]} style={style} data={data} />
        ))}
      </div>
    </>
  );
}

export function start(data: ResolverInput) {
  $('title').text(`${data.name} - Realboard`);
  $('.header .title').text(`${data.name}`);
  
  if (!isACM(data.rule)) {
    $('.header .solved').text('Score');
    $('.header .penalty').hide();
  }

  const teams = data.teams.map((v) => ({
    id: v.id,
    rank: 0,
    score: 0,
    penalty: 0,
    ranked: !v.exclude,
    total: 0,
    problems: data.problems.map((problem, idx) => ({
      old: 0,
      frozen: 0,
      pass: false,
      id: problem.id,
      index: idx,
      time: 0,
      score: 0,
      touched: false,
      verdict: '',
    })),
  }));
  
  const allSubmissions = data.submissions.sort((a, b) => a.time - b.time);
  
  for (const submission of allSubmissions) {
    const team = teams.find((v) => v.id === submission.team);
    if (!team) continue;
    const isFrozen = submission.time > data.frozen && data.frozen > 0 && data.frozen < data.duration;
    const problem = team.problems.find((i) => i.id === submission.problem);
    // For ACM, skip if already passed. For OI, we need to process unless it's worse.
    if (!problem || (isACM(data.rule) && problem.pass)) continue;
    
    team.total++;
    if (isFrozen) problem.frozen += 1;
    else {
      // Update verdict for display
      problem.verdict = submission.verdict;

      if (isACM(data.rule)) {
          if (submission.verdict === 'AC') {
            problem.pass = true;
            problem.time = Math.floor(submission.time / 60);
            team.score += 1;
            team.penalty += Math.floor(submission.time / 60) + problem.old * (data.penalty || 20);
          }
      } else {
          const newScore = submission.score || 0;
          const oldScore = problem.score || 0;
          if (newScore > oldScore) {
              team.score += (newScore - oldScore);
              problem.score = newScore;
              if (newScore >= 100 || submission.verdict === 'AC') problem.pass = true;
          }
          problem.touched = true;
      }
      problem.old += 1;
    }
  }
  
  processRank(teams, data.rule);
  
  const container = document.createElement('div');
  document.querySelector('.header')!.after(container);
  
  ReactDOM.createRoot(container).render(
    <RealboardMain data={data} initialTeams={teams} />
  );
}

addPage(new NamedPage(['realboard'], () => {
  start((window as any).UiContext.payload);
}));

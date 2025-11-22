/**
 * Realboard - HydroOJ 实时滚榜插件类型定义
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

export interface ResolverInput {
  name: string;
  rule: string;
  duration: number;
  frozen: number;
  penalty: number;
  problems: {
    name: string;
    id: string;
  }[];
  teams: {
    id: string;
    name: string;
    avatar: string;
    institution: string;
    exclude: boolean;
  }[];
  submissions: {
    team: string;
    problem: string;
    verdict: string;
    score?: number;
    time: number;
  }[];
} 
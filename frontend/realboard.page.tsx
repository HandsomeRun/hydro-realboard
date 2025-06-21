import { addPage, NamedPage, React, ReactDOM } from '@hydrooj/ui-default';
import { animated, easings, useSprings, useTransition } from '@react-spring/web';
import { ResolverInput } from '../interface';

const MAX_QUEUE = 9;
const FADEOUT_TIME = 5000; // ms

// 共享的状态管理
const sharedState = {
  onBStageAppear: null as ((submissionId: string) => void) | null,
  setOnBStageAppear: (callback: (submissionId: string) => void) => {
    sharedState.onBStageAppear = callback;
  }
};

function status(problem) {
  if (!problem) return 'untouched';
  if (problem.pass) return 'ac';
  if (!problem.old && !problem.frozen) return 'untouched';
  if (problem.frozen) return 'frozen';
  return 'failed';
}

function submissions(problem) {
  const st = status(problem);
  if (st === 'ac') { return `${problem.old} / ${problem.time}`; }
  if (st === 'frozen') { return `${problem.old}+${problem.frozen}`; }
  if (st === 'failed') { return problem.old; }
  return String.fromCharCode('A'.charCodeAt(0) + problem.index);
}

function processRank(teams) {
  const clone = [...teams];
  clone.sort((a, b) => b.score - a.score || a.penalty - b.penalty || b.total - a.total);
  let rank = 1;
  for (const team of clone) {
    if (!team.exclude) {
      team.rank = rank;
      rank++;
    } else {
      team.rank = -1;
    }
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
    const baseStatus = status(problemStatus);
    
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
            text: 'AC'
          };
        } else {
          // 正常提交：显示实际结果
          return {
            className: `${team.submissionVerdict === 'AC' ? 'ac' : 'wa'} item`,
            text: team.submissionVerdict
          };
        }
      }
    }
    
    // 其他题目显示正常状态
    return {
      className: `${baseStatus} item`,
      text: submissions(problemStatus)
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
    <div className="penalty">{team.penalty}</div>
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
    if (problem?.pass) return t;
    
    team.total++;
    
    if (sub.time <= data.frozen) {
      if (sub.verdict === 'AC') {
        problem.pass = true;
        problem.time = Math.floor(sub.time / 60);
        team.score += 1;
        team.penalty += Math.floor(sub.time / 60) + problem.old * 20;
      }
      problem.old += 1;
    } else {
        problem.frozen = (problem.frozen || 0) + 1;
    }
    
    processRank(t);
    return t;
  }, [data.frozen]);

  const createDisplayItem = React.useCallback((sub) => {
    const team = allTeams.find((v) => v.id === sub.team);
    if (!team) return null;
    
    const problem = team.problems.find((p) => p.id === sub.problem);
    const isRepeatedAC = problem && problem.pass && sub.verdict === 'AC';
    const isPending = sub.verdict === undefined;
    const isFrozenSubmission = sub.time > data.frozen;

    const newItem = { 
      ...team, 
      fade: false, 
      fadeKey: Math.random(),
      createdAt: Date.now(),
      submissionId: sub.id,
      submissionProblem: sub.problem,
      submissionVerdict: isFrozenSubmission ? 'FROZEN' : sub.verdict,
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
  }, [allTeams, data.frozen, updateTeamsWithSubmission]);

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
    })),
  }));
  
  const allSubmissions = data.submissions.filter((i) => !['CE', 'SE', 'FE', 'IGN'].includes(i.verdict)).sort((a, b) => a.time - b.time);
  
  for (const submission of allSubmissions) {
    const team = teams.find((v) => v.id === submission.team);
    if (!team) continue;
    const isFrozen = submission.time > data.frozen;
    const problem = team.problems.find((i) => i.id === submission.problem);
    if (!problem || problem.pass) continue;
    team.total++;
    if (isFrozen) problem.frozen += 1;
    else {
      if (submission.verdict === 'AC') {
        problem.pass = true;
        problem.time = Math.floor(submission.time / 60);
        team.score += 1;
        team.penalty += Math.floor(submission.time / 60) + problem.old * 20;
      }
      problem.old += 1;
    }
  }
  
  processRank(teams);
  
  const container = document.createElement('div');
  document.querySelector('.header')!.after(container);
  
  ReactDOM.createRoot(container).render(
    <RealboardMain data={data} initialTeams={teams} />
  );
}

addPage(new NamedPage(['realboard'], () => {
  start((window as any).UiContext.payload);
}));

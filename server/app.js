/**
 * 웹 기반 테스트 실행 서버
 * Express.js를 사용하여 웹 대시보드에서 테스트를 실행하고 결과를 확인할 수 있습니다.
 */

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8000;
const TEST_DIR = path.join(__dirname, '..');

// 미들웨어
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 테스트 실행 상태 저장
const testRuns = new Map();

/**
 * 테스트 실행 함수
 */
async function runTests(testFile = null, options = {}) {
  return new Promise((resolve, reject) => {
    const runId = Date.now().toString();
    const testCommand = testFile 
      ? `npx playwright test ${testFile}`
      : 'npm test';
    
    const command = `cd "${TEST_DIR}" && ${testCommand}`;
    
    // 환경 변수 준비: 기본값 + .env 파일 + 웹에서 받은 값
    const envVars = {
      ...process.env,
      // .env 파일이 있으면 dotenv로 로드한 값 사용
    };
    
    // 웹에서 받은 환경 변수가 있으면 우선 적용
    if (options.env) {
      Object.assign(envVars, options.env);
    }
    
    testRuns.set(runId, {
      id: runId,
      status: 'running',
      startTime: new Date(),
      output: [],
      testFile: testFile || 'all',
      options
    });

    const process = exec(command, {
      cwd: TEST_DIR,
      env: envVars
    }, (error, stdout, stderr) => {
      const run = testRuns.get(runId);
      if (error) {
        run.status = 'failed';
        run.error = error.message;
        run.output.push(stderr);
      } else {
        run.status = 'completed';
        run.output.push(stdout);
      }
      run.endTime = new Date();
      run.duration = run.endTime - run.startTime;
      testRuns.set(runId, run);
      
      if (error) {
        reject(error);
      } else {
        resolve(run);
      }
    });

    // 실시간 출력 전송
    process.stdout.on('data', (data) => {
      const run = testRuns.get(runId);
      run.output.push(data.toString());
      io.emit('test-output', { runId, data: data.toString() });
    });

    process.stderr.on('data', (data) => {
      const run = testRuns.get(runId);
      run.output.push(data.toString());
      io.emit('test-output', { runId, data: data.toString() });
    });

    // 프로세스 종료 이벤트
    process.on('close', (code) => {
      const run = testRuns.get(runId);
      run.exitCode = code;
      io.emit('test-complete', { runId, status: run.status, exitCode: code });
    });
  });
}

// API 라우트

/**
 * 모든 테스트 실행
 */
app.post('/api/tests/run', async (req, res) => {
  try {
    const { testFile, options } = req.body;
    const run = await runTests(testFile, options);
    res.json({ success: true, runId: run.id, run });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 테스트 실행 상태 조회
 */
app.get('/api/tests/status/:runId', (req, res) => {
  const run = testRuns.get(req.params.runId);
  if (!run) {
    return res.status(404).json({ error: 'Test run not found' });
  }
  res.json(run);
});

/**
 * 모든 테스트 실행 히스토리 조회
 */
app.get('/api/tests/history', (req, res) => {
  const history = Array.from(testRuns.values())
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 50); // 최근 50개만
  res.json(history);
});

/**
 * 테스트 리포트 조회
 */
app.get('/api/tests/report', async (req, res) => {
  try {
    const reportPath = path.join(TEST_DIR, 'playwright-report', 'index.html');
    const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
    
    if (reportExists) {
      res.json({ 
        exists: true, 
        url: '/report/index.html',
        path: reportPath 
      });
    } else {
      res.json({ exists: false, message: 'Report not generated yet' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 리포트 파일 서빙
 */
app.use('/report', express.static(path.join(TEST_DIR, 'playwright-report')));

/**
 * 테스트 목록 조회
 */
app.get('/api/tests/list', async (req, res) => {
  try {
    const { exec } = require('child_process');
    const command = `cd "${TEST_DIR}" && npx playwright test --list --json`;
    
    exec(command, { cwd: TEST_DIR }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      
      try {
        const tests = JSON.parse(stdout);
        res.json(tests);
      } catch (parseError) {
        res.status(500).json({ error: 'Failed to parse test list' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket 연결
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 서버 시작
server.listen(PORT, () => {
  console.log(`🚀 테스트 실행 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📊 대시보드: http://localhost:${PORT}`);
  console.log(`📝 API: http://localhost:${PORT}/api`);
});


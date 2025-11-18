/**
 * 테스트 로깅 유틸리티
 * 구조화된 로깅을 제공합니다.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
}

class Logger {
  private logs: LogEntry[] = [];
  private enabled: boolean = true;
  private minLevel: LogLevel = process.env.CI ? LogLevel.INFO : LogLevel.DEBUG;

  /**
   * 로깅 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 최소 로그 레벨 설정
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * 로그 레벨 비교
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  /**
   * 로그 기록
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (!this.enabled || !this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    };

    this.logs.push(entry);

    // 콘솔 출력
    const prefix = `[${level}] [${entry.timestamp.toISOString()}]`;
    if (context) {
      console.log(`${prefix} ${message}`, context);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * DEBUG 레벨 로그
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * INFO 레벨 로그
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * WARN 레벨 로그
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * ERROR 레벨 로그
   */
  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * 모든 로그 가져오기
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 로그 초기화
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * 로그를 파일로 저장 (선택사항)
   */
  async saveToFile(path: string): Promise<void> {
    // 필요시 파일 저장 로직 구현
    // 예: fs.writeFileSync(path, JSON.stringify(this.logs, null, 2));
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();


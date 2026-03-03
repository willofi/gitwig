import React from 'react';
import { useRepoStore } from '@/store/repoStore';
import { Terminal, Clock, CheckCircle2, AlertCircle, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const GitLogView: React.FC = () => {
  const { gitLogs, setViewMode } = useRepoStore();
  const [filter, setFilter] = React.useState('');

  const filteredLogs = gitLogs.filter(log => 
    log.command.toLowerCase().includes(filter.toLowerCase()) ||
    (log.error || '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] text-[#c9d1d9] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1f6feb]/10 rounded-lg text-[#58a6ff]">
            <Terminal size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Git Activity Console</h2>
            <p className="text-xs text-[#8b949e]">Tracking all git commands executed in this session</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
            <input 
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search logs..."
              className="bg-[#0d1117] border border-[#30363d] rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-[#1f6feb] w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => setViewMode('repo')}
            className="px-4 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md text-sm font-medium transition-colors"
          >
            Close Console
          </button>
        </div>
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#30363d]">
        <div className="max-w-5xl mx-auto space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#484f58]">
              <Terminal size={48} strokeWidth={1} className="mb-4" />
              <p className="italic">No activity recorded yet.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className={`group border rounded-lg overflow-hidden transition-all ${
                  log.status === 'error' ? 'border-red-900/30 bg-red-900/5' : 'border-[#30363d] bg-[#161b22]/50 hover:bg-[#161b22]'
                }`}
              >
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {log.status === 'pending' ? (
                      <div className="w-2 h-2 rounded-full bg-[#1f6feb] animate-pulse" />
                    ) : log.status === 'success' ? (
                      <CheckCircle2 size={16} className="text-[#3fb950] shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="text-[#f85149] shrink-0" />
                    )}
                    
                    <div className="font-mono text-sm text-[#e6edf3] truncate">
                      <span className="text-[#8b949e] mr-2">$</span>
                      {log.command}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-[11px] text-[#8b949e]">
                    {log.duration !== undefined && (
                      <span className="font-mono">{log.duration}ms</span>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{format(log.timestamp, 'HH:mm:ss')}</span>
                    </div>
                  </div>
                </div>
                
                {log.error && (
                  <div className="px-4 py-3 bg-[#0d1117] border-t border-red-900/20 font-mono text-xs text-red-400 whitespace-pre-wrap">
                    {log.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer / Stats */}
      <div className="px-6 py-3 border-t border-[#30363d] bg-[#161b22] text-[11px] text-[#8b949e] flex justify-between">
        <div className="flex gap-4">
          <span>Total: <strong>{gitLogs.length}</strong> commands</span>
          <span className="text-[#3fb950]">Success: <strong>{gitLogs.filter(l => l.status === 'success').length}</strong></span>
          <span className="text-[#f85149]">Errors: <strong>{gitLogs.filter(l => l.status === 'error').length}</strong></span>
        </div>
        <div className="italic">Logs are kept for the current session only</div>
      </div>
    </div>
  );
};

export default GitLogView;

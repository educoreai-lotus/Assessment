import { useEffect, useState } from 'react';
import { analyticsApi } from '../../services/analyticsApi';
import { reportingApi } from '../../services/reportingApi';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#10b981', '#34d399', '#60a5fa', '#fde68a', '#f472b6'];

export default function ResultsDashboard() {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.allSettled([analyticsApi.getExams(), reportingApi.getSummary()])
      .then(([a, r]) => {
        if (!mounted) return;
        const skillData = (a.status === 'fulfilled' ? a.value?.skills : []) || [];
        setSkills(skillData);
        setSummary(r.status === 'fulfilled' ? r.value : null);
      })
      .catch((e) => setError(e?.message || 'Failed to load results'))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <LoadingSpinner label="Loading results..." />;

  const finalGrade = summary?.final_grade ?? '—';
  const passFail = summary?.pass ? 'Pass' : 'Fail';

  return (
    <div className="container-safe py-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-sm text-neutral-400 mb-1">Final Grade</div>
          <div className="text-3xl font-semibold">{finalGrade}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-400 mb-1">Status</div>
          <div className="text-2xl font-semibold">{passFail}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-400 mb-1">Skills</div>
          <div className="text-2xl font-semibold">{skills.length}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/60 text-red-200 p-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Per-skill Scores</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skills}>
                <XAxis dataKey="skill" stroke="#a3a3a3" />
                <YAxis stroke="#a3a3a3" />
                <Tooltip />
                <Bar dataKey="score" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={skills.map((s) => ({ name: s.skill, value: s.score }))}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={75}
                >
                  {skills.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}



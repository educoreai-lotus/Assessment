import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const features = [
  {
    title: 'AI Question Generation',
    desc: 'Adaptive theoretical questions tailored to your skills.',
  },
  {
    title: 'Automated Evaluation',
    desc: 'Per-skill feedback with final weighted grade.',
  },
  {
    title: 'Integrity & Analytics',
    desc: 'Proctoring insights and rich reporting overview.',
  },
];

export default function HomePage() {
  return (
    <div className="container-safe py-12">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl md:text-6xl font-bold gradient-text">
          EduCore AI Assessment Center
        </h1>
        <p className="mt-4 text-neutral-300">
          Test your skills, challenge your knowledge, and track your growth.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link className="btn-emerald" to="/exam/baseline">Take Baseline Exam</Link>
          <Link className="btn-emerald" to="/exam/postcourse">Take Post-Course Exam</Link>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="card p-6"
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20 }}
            >
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-neutral-300">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}



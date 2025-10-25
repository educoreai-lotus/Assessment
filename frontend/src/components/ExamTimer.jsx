import React, { useEffect, useState } from "react";

export default function ExamTimer({ minutes }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="text-right mb-4 font-mono">
      Time Left: {mins}:{secs.toString().padStart(2, "0")}
    </div>
  );
}



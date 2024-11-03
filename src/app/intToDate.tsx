import React from 'react';
import { formatDuration, intervalToDuration } from 'date-fns';

function formatSecondsToTime(seconds) {
  // Convert seconds to duration format
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });

  // Format the duration into hours, minutes, and seconds
  return formatDuration(duration, { format: ['hours', 'minutes', 'seconds'] });
}

export default function TimeDisplay({ seconds }) {
  return <div>{formatSecondsToTime(seconds)}</div>;
}
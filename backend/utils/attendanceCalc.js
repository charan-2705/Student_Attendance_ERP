/**
 * Processes attendance data into direct dashboard status messages
 * @param {number} attended - Number of classes attended
 * @param {number} total - Total number of classes conducted
 * @returns {Object} Simple status state
 */
const calculatePredictiveMetrics = (attended, total) => {
  const currentRate = total > 0 ? Math.round((attended / total) * 100) : 0;

  if (currentRate >= 75) {
    return {
      currentPercentage: currentRate,
      isSafe: true,
      message: "Safe Zone"
    };
  } else {
    // Calculate exactly how many consecutive classes are needed to hit 75%
    const classesNeeded = Math.ceil((0.75 * total - attended) / 0.25);
    return {
      currentPercentage: currentRate,
      isSafe: false,
      message: `You need to attend ${classesNeeded} more consecutive classes to reach the 75% threshold.`
    };
  }
};

module.exports = calculatePredictiveMetrics;
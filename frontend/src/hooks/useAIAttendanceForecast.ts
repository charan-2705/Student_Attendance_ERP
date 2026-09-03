import {
  useCallback,
  useEffect,
  useState
} from 'react';

export interface AIPredictionResult {
  currentRate: string;
  predictedRate: string;
  modelInsights: string;
}

interface UseAIAttendanceForecastProps {
  studentId?: string;
  currentView: string;
}

export default function useAIAttendanceForecast({
  studentId,
  currentView
}: UseAIAttendanceForecastProps) {
  const [
    simulatedAbsences,
    setSimulatedAbsences
  ] = useState('0');

  const [
    aiReport,
    setAiReport
  ] = useState<AIPredictionResult | null>(
    null
  );

  const runAIEngineForecast =
    useCallback(() => {
      const token =
        localStorage.getItem(
          'erp_session_token'
        );

      fetch(
        'http://localhost:5000/api/ai/predict-attendance',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            studentId,
            additionalProjectedAbsences:
              simulatedAbsences
          })
        }
      )
        .then(res => res.json())
        .then(
          (
            data: AIPredictionResult
          ) => {
            setAiReport(data);
          }
        )
        .catch(err => {
          console.error(
            'AI attendance forecast error:',
            err
          );
        });
    }, [
      studentId,
      simulatedAbsences
    ]);

  useEffect(() => {
    if (
      currentView ===
      'student-ai-insights'
    ) {
      runAIEngineForecast();
    }
  }, [
    currentView,
    runAIEngineForecast
  ]);

  return {
    simulatedAbsences,
    setSimulatedAbsences,
    aiReport,
    runAIEngineForecast
  };
}
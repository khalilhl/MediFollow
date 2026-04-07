import React, { useState, useEffect } from 'react';
import { Table, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { patientApi } from '../services/api';
import { useTranslation } from 'react-i18next';

export default function MoodInsightsHistory({ patientId }) {
  const { t } = useTranslation();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        if(!patientId) return;
        const data = await patientApi.getMoodInsights(patientId);
        if (mounted) setInsights(Array.isArray(data) ? data.slice().reverse() : []);
      } catch (err) {
        if (mounted) setError('Failed to load insight history');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [patientId]);

  const exportCSV = () => {
    if (!insights.length) return;
    const headers = ['Date', 'Global Score', 'Emotion Score', 'Vital Trend', 'Symptoms Severity', 'Recommendation'];
    const rows = insights.map(i => [
      new Date(i.date).toLocaleDateString(),
      i.overallMoodScore,
      (i.emotionScore * 100).toFixed(0) + '%',
      (i.vitalTrendScore * 100).toFixed(0) + '%',
      (i.symptomSeverityScore * 100).toFixed(0) + '%',
      `"${(i.recommendation || '').replace(/"/g, '""')}"`
    ]);
    const csvData = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `insights_${patientId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
        <h5 className="mb-0"><i className="ri-history-line me-2"></i>{t('moodInsights.historyTitle', 'Historique des Insights')}</h5>
        <div className="d-flex gap-2">
          <Button variant="outline-success" size="sm" onClick={exportCSV} disabled={insights.length === 0}>
            <i className="ri-file-excel-line me-1"></i>{t('moodInsights.exportCSV', 'Export CSV')}
          </Button>
          <Button variant="outline-danger" size="sm" onClick={exportPDF} disabled={insights.length === 0}>
            <i className="ri-file-pdf-line me-1"></i>{t('moodInsights.exportPDF', 'Export PDF')}
          </Button>
        </div>
      </div>
      
      {insights.length === 0 ? (
        <Alert variant="light" className="text-muted text-center border">{t('moodInsights.noHistory', 'Aucun historique disponible.')}</Alert>
      ) : (
        <div className="table-responsive">
          <Table hover size="sm" className="align-middle border bg-white mb-0">
            <thead className="table-light">
              <tr>
                <th>{t('moodInsights.tableDate', 'Date')}</th>
                <th>{t('moodInsights.tableScore', 'Score Global')}</th>
                <th>{t('moodInsights.tableRecommendation', 'Recommandation')}</th>
                <th>{t('moodInsights.tableStatus', 'Statut')}</th>
              </tr>
            </thead>
            <tbody>
              {insights.map(item => (
                <tr key={item._id || item.date}>
                  <td className="text-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                  <td>
                    <Badge bg={item.overallMoodScore >= 80 ? 'success' : item.overallMoodScore >= 50 ? 'warning' : 'danger'}>
                      {item.overallMoodScore}/100
                    </Badge>
                  </td>
                  <td>
                    <span className="small text-muted">{item.recommendation}</span>
                  </td>
                  <td>
                    {item.alertTriggered ? (
                      <Badge bg="danger">{t('moodInsights.alertActive', 'Alerte Active')}</Badge>
                    ) : (
                      <Badge bg="secondary">{t('moodInsights.normal', 'Normal')}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}

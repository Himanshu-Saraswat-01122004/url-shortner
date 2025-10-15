import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AnalyticsChart = ({ data }) => {
  const chartData = {
    labels: data.slice(0, 10).map(item => {
      // Truncate long URLs for display
      const url = item.longUrl || item.shortCode;
      return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }),
    datasets: [
      {
        label: 'Clicks',
        data: data.slice(0, 10).map(item => parseInt(item.clickCount) || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        display: false,
      },
      title: {
        display: true,
        text: 'Top URLs by Clicks',
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#1f2937',
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex;
            const item = data[index];
            return item.longUrl || item.shortCode;
          },
          label: function(context) {
            return `Clicks: ${context.parsed.y}`;
          },
          afterLabel: function(context) {
            const index = context.dataIndex;
            const item = data[index];
            return `Short Code: ${item.shortCode}`;
          },
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: '#6b7280',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        ticks: {
          color: '#6b7280',
          maxRotation: 45,
          minRotation: 0,
        },
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default AnalyticsChart;

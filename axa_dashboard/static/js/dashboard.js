// AXA Actuarial Risk Portfolio - React Dashboard Application
const { useState, useEffect, useRef, useMemo } = React;

// --- Helper: Currency Formatter ---
function formatCurrency(val) {
  if (val === undefined || val === null) return "-";
  if (val >= 1e12) {
    return "IDR " + (val / 1e12).toFixed(2) + " T";
  } else if (val >= 1e9) {
    return "IDR " + (val / 1e9).toFixed(2) + " Miliar";
  } else if (val >= 1e6) {
    return "IDR " + (val / 1e6).toFixed(2) + " Juta";
  }
  return "IDR " + val.toLocaleString("id-ID");
}

function formatExposureCompact(val) {
  if (val === undefined || val === null) return "-";
  if (val >= 1e15) {
    return "IDR " + (val / 1e15).toFixed(2) + " P";
  } else if (val >= 1e12) {
    return "IDR " + (val / 1e12).toFixed(1) + " T";
  } else if (val >= 1e9) {
    return "IDR " + (val / 1e9).toFixed(1) + " M";
  }
  return "IDR " + val.toLocaleString("id-ID");
}

function calculateMedian(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// --- Component: Info Tooltip ---
// Renders a ℹ️ icon; on hover shows a popup with title, explanation, and optional formula.
const InfoTooltip = ({ title, info, formula, left }) => (
  <div className={`info-tooltip-wrapper${left ? ' tip-left' : ''}`}>
    <i className="fas fa-circle-info info-tooltip-icon"></i>
    <div className="info-tooltip-box">
      {title && <strong>{title}</strong>}
      <span>{info}</span>
      {formula && <div className="formula">{formula}</div>}
    </div>
  </div>
);

// --- Component: Claim Severity Filter Chart per COB ---
const COB_COLORS = ['#435ebe','#e11d48','#f59e0b','#10b981','#8b5cf6','#0891b2','#f43f5e','#64748b','#16a34a','#ea580c'];

const ClaimSeverityChart = ({ cobPortfolio, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const allCobs = useMemo(() => (cobPortfolio || []).map(d => d.cob), [cobPortfolio]);
  const [activeCobs, setActiveCobs] = useState(allCobs);

  useEffect(() => { setActiveCobs(allCobs); }, [allCobs.join(',')]);

  const toggleCob = (cob) => {
    setActiveCobs(prev =>
      prev.includes(cob)
        ? prev.length > 1 ? prev.filter(c => c !== cob) : prev
        : [...prev, cob]
    );
  };

  const toggleAll = () => {
    setActiveCobs(prev => prev.length === allCobs.length ? [allCobs[0]] : allCobs);
  };

  useEffect(() => {
    if (!chartRef.current || !cobPortfolio) return;
    const isDark = theme === "dark";
    const textColor = isDark ? "#9ca3af" : "#4f5d73";
    const borderColor = isDark ? "#374151" : "#eceff5";
    const chartMode = isDark ? "dark" : "light";
    const bgColor = isDark ? "#1f2937" : "#ffffff";

    const filtered = cobPortfolio.filter(d => activeCobs.includes(d.cob));
    const sorted = [...filtered].sort((a, b) => (b.severityGross || 0) - (a.severityGross || 0));
    const colors = sorted.map(d => COB_COLORS[allCobs.indexOf(d.cob) % COB_COLORS.length]);

    const options = {
      series: [{ name: 'Avg Claim Severity (Juta IDR)', data: sorted.map(d => parseFloat((d.severityGross || 0).toFixed(2))) }],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        background: 'transparent',
        foreColor: textColor,
        fontFamily: "'Inter', sans-serif"
      },
      plotOptions: {
        bar: {
          horizontal: false,
          distributed: true,
          columnWidth: '55%',
          borderRadius: 6,
          dataLabels: { position: 'top' }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => val.toFixed(0) + 'M',
        offsetY: -22,
        style: { fontSize: '11px', fontWeight: 600, colors: [textColor] },
        background: {
          enabled: false
        },
        dropShadow: {
          enabled: false
        }
      },
      xaxis: {
        categories: sorted.map(d => d.cob),
        labels: { style: { colors: textColor, fontSize: '11px', fontWeight: 600 } }
      },
      yaxis: {
        title: { text: 'Avg Severity (Juta IDR)', style: { color: textColor, fontSize: '11px' } },
        labels: { formatter: (val) => val.toFixed(0) + 'M', style: { colors: textColor } }
      },
      colors: colors,
      grid: {
        borderColor: borderColor,
        padding: {
          left: 18,
          right: 12
        }
      },
      theme: { mode: chartMode },
      legend: { show: false },
      tooltip: {
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          const d = sorted[dataPointIndex];
          const clr = colors[dataPointIndex];
          return `<div style="padding:10px 14px;border-left:4px solid ${clr};background:${bgColor};border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
            <div style="font-weight:700;color:${clr};margin-bottom:4px;">${d.cob}</div>
            <div style="font-size:12px;color:${textColor};line-height:1.8;">
              Avg Severity: <strong>${(d.severityGross||0).toFixed(2)} Juta IDR</strong><br/>
              Jumlah Klaim: <strong>${(d.claimCount||0).toLocaleString('id-ID')}</strong><br/>
              Gross Claims: <strong>${formatCurrency(d.grossClaims)}</strong><br/>
              Loss Ratio: <strong style="color:${d.lossRatio > 60 ? '#ef4444' : '#10b981'};">${d.lossRatio}%</strong>
            </div>
          </div>`;
        }
      },
      annotations: {
        yaxis: [{
          y: filtered.reduce((s, d) => s + (d.severityGross||0), 0) / (filtered.length || 1),
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          strokeDashArray: 4,
          label: {
            text: 'Rata-rata Portfolio',
            position: 'right',
            offsetX: -10,
            offsetY: -2,
            textAnchor: 'end',
            style: {
              color: '#f59e0b',
              fontSize: '10px',
              fontWeight: 700,
              background: bgColor,
              borderColor: '#f59e0b',
              borderWidth: 1,
              borderRadius: 999,
              padding: {
                left: 8,
                right: 8,
                top: 3,
                bottom: 3
              }
            }
          }
        }]
      }
    };

    if (chartInstance.current) chartInstance.current.destroy();
    chartInstance.current = new ApexCharts(chartRef.current, options);
    chartInstance.current.render();

    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
  }, [cobPortfolio, activeCobs, theme]);

  return (
    <div className="claim-severity-chart">
      <div className="filter-chips-row">
        <span className="filter-label">Filter COB:</span>
        <div
          className={`filter-chip ${activeCobs.length === allCobs.length ? 'active' : ''}`}
          onClick={toggleAll}
        >Semua</div>
        {allCobs.map((cob, i) => (
          <div
            key={cob}
            className={`filter-chip ${activeCobs.includes(cob) ? 'active' : ''}`}
            onClick={() => toggleCob(cob)}
            style={activeCobs.includes(cob) ? { background: COB_COLORS[i % COB_COLORS.length], borderColor: COB_COLORS[i % COB_COLORS.length] } : {}}
          >
            {cob}
          </div>
        ))}
      </div>
      <div ref={chartRef}></div>
    </div>
  );
};

// --- Component: Sidebar ---
const Sidebar = ({ activeTab, setActiveTab, theme, toggleTheme }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenuClick = (target) => {
    setActiveTab(target);
    setMobileOpen(false);
    document.querySelector(".sidebar").classList.remove("active-sidebar");
    const toggleBtn = document.getElementById("sidebar-toggle-btn");
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/static/AXA_Logo.svg" alt="AXA Logo" style={{ flexShrink: 0 }} />
      </div>
      
      <ul className="sidebar-menu">
        <li className="menu-category">Menu Analisis</li>
        <li className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleMenuClick('dashboard')}>
          <i className="fas fa-chart-pie"></i> Ringkasan Portofolio
        </li>
        <li className={`menu-item ${activeTab === 'matrix' ? 'active' : ''}`} onClick={() => handleMenuClick('matrix')}>
          <i className="fas fa-circle-nodes"></i> Matriks Profil Risiko
        </li>
        <li className={`menu-item ${activeTab === 'concentration' ? 'active' : ''}`} onClick={() => handleMenuClick('concentration')}>
          <i className="fas fa-chart-line"></i> Tren &amp; Konsentrasi Risiko
        </li>
        <li className={`menu-item ${activeTab === 'drilldown' ? 'active' : ''}`} onClick={() => handleMenuClick('drilldown')}>
          <i class="fas fa-magnifying-glass-chart"></i> Root Cause Analysis
        </li>
        <li className={`menu-item ${activeTab === 'strategy' ? 'active' : ''}`} onClick={() => handleMenuClick('strategy')}>
          <i class="fas fa-shield-halved"></i> Rekomendasi Strategis
        </li>
        <li className={`menu-item ${activeTab === 'glossary' ? 'active' : ''}`} onClick={() => handleMenuClick('glossary')}>
          <i class="fas fa-book-open"></i> Kamus Istilah Asuransi
        </li>
      </ul>
      

    </aside>
  );
};

// --- Component: Radial Gauge (Gross vs Net Loss Ratio) ---
const LossRatioGauge = ({ data, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && data) {
      const isDark = theme === "dark";
      const textColor = isDark ? "#9ca3af" : "#4f5d73";
      const chartMode = isDark ? "dark" : "light";

      const options = {
        series: [data.grossLossRatio, data.netLossRatio],
        chart: {
          height: 320,
          type: 'radialBar',
          background: 'transparent',
          foreColor: textColor
        },
        plotOptions: {
          radialBar: {
            offsetY: 0,
            startAngle: 0,
            endAngle: 270,
            hollow: {
              margin: 5,
              size: '30%',
              background: 'transparent',
            },
            dataLabels: {
              name: {
                show: true,
                fontSize: '14px',
                fontWeight: 700,
              },
              value: {
                show: true,
                fontSize: '16px',
                fontWeight: 800,
                formatter: function (val) {
                  return val.toFixed(2) + "%";
                }
              },
              total: {
                show: true,
                label: 'Gross vs Net',
                formatter: function () { return ""; }
              }
            }
          }
        },
        colors: ['#435ebe', '#ea580c'],
        labels: ['Gross Loss Ratio', 'Net Loss Ratio'],
        legend: {
          show: true,
          floating: true,
          fontSize: '12px',
          position: 'left',
          offsetX: -10,
          offsetY: 10,
          labels: { useSeriesColors: true },
          markers: { size: 0 },
          itemMargin: { vertical: 3 }
        },
        theme: { mode: chartMode }
      };

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, theme]);

  return <div ref={chartRef}></div>;
};

// --- Component: Reinsurance Column Chart ---
const ReinsuranceChart = ({ data, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && data) {
      const isDark = theme === "dark";
      const textColor = isDark ? "#9ca3af" : "#4f5d73";
      const borderColor = isDark ? "#374151" : "#eceff5";
      const chartMode = isDark ? "dark" : "light";

      const options = {
        series: [{
          name: 'Premi / Klaim Kotor (Gross)',
          data: [data.gwp, data.grossIncurred]
        }, {
          name: 'Skema Reasuransi (Ceded / Recovered)',
          data: [data.rwp, data.riRecovery]
        }, {
          name: 'Premi / Klaim Bersih (Net)',
          data: [data.nwp, data.netIncurred]
        }],
        chart: {
          type: 'bar',
          height: 320,
          toolbar: { show: false },
          background: 'transparent',
          foreColor: textColor
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '55%',
            borderRadius: 6
          },
        },
        dataLabels: { enabled: false },
        stroke: {
          show: true,
          width: 2,
          colors: ['transparent']
        },
        xaxis: {
          categories: ['Premi (Written Premium)', 'Klaim (Incurred Claims)'],
          labels: {
            style: {
              colors: textColor,
              fontSize: '12px',
              fontWeight: 600
            }
          }
        },
        yaxis: {
          labels: {
            formatter: function (val) {
              return (val / 1e12).toFixed(2) + " T IDR";
            },
            style: { colors: textColor }
          }
        },
        fill: { opacity: 1 },
        tooltip: {
          y: {
            formatter: function (val) {
              return formatCurrency(val);
            }
          }
        },
        colors: ['#435ebe', '#f59e0b', '#10b981'],
        grid: { borderColor: borderColor },
        theme: { mode: chartMode }
      };

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, theme]);

  return <div ref={chartRef}></div>;
};

// --- Component: Risk Bubble Chart ---
const RiskBubbleChart = ({ cobList, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && cobList) {
      const isDark = theme === "dark";
      const textColor = isDark ? "#9ca3af" : "#334155";
      const borderColor = isDark ? "#374151" : "#cbd5e1";
      const chartMode = isDark ? "dark" : "light";

      // Group series based on risk category
      const criticalSeries = [];
      const strategicSeries = [];
      const stableSeries = [];
      const inefficientSeries = [];

      cobList.forEach(item => {
        // Log10 transform of actual exposure in IDR
        const xVal = item.exposure > 0 ? parseFloat(Math.log10(item.exposure).toFixed(4)) : 0;

        const point = {
          x: xVal,
          y: parseFloat(item.lossRatio.toFixed(2)),
          z: parseFloat(Math.sqrt(item.gwp / 1e9).toFixed(2)), // GWP size proportional to square root for balanced area weight
          name: item.cob,
          gwpRaw: item.gwp,
          exposureRaw: item.exposure,
          claimsRaw: item.grossClaims,
          risk: item.riskCategory
        };

        if (item.riskCategory === "Critical Risk") {
          criticalSeries.push(point);
        } else if (item.riskCategory === "Strategic Segment") {
          strategicSeries.push(point);
        } else if (item.riskCategory === "Stable Segment") {
          stableSeries.push(point);
        } else if (item.riskCategory === "Inefficient Segment") {
          inefficientSeries.push(point);
        }
      });

      const options = {
        series: [
          { name: 'Critical Risk (High Exposure, High Loss)', data: criticalSeries },
          { name: 'Strategic Segment (High Exposure, Low Loss)', data: strategicSeries },
          { name: 'Stable Segment (Low Exposure, Low Loss)', data: stableSeries },
          { name: 'Inefficient Segment (Low Exposure, High Loss)', data: inefficientSeries }
        ],
        chart: {
          height: 400,
          type: 'bubble',
          toolbar: { show: true },
          background: 'transparent',
          foreColor: textColor,
          fontFamily: "'Inter', 'Nunito', sans-serif"
        },
        plotOptions: {
          bubble: {
            minBubbleRadius: 20,
            maxBubbleRadius: 50
          }
        },
        stroke: {
          width: 1.5,
          colors: isDark ? ['#1f2937'] : ['#ffffff'] // matches bg-card
        },
      dataLabels: {
        enabled: true,
        formatter: function (val, opt) {
          return opt.w.config.series?.[opt.seriesIndex]?.data?.[opt.dataPointIndex]?.name || "";
        },
          style: {
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            colors: ['#0f172a'] // Dark text for high readability
          },
          background: {
            enabled: true,
            foreColor: '#0f172a',
            padding: 4,
            borderRadius: 3,
            borderWidth: 1,
            borderColor: '#94a3b8',
            opacity: 0.95
          }
        },
        fill: { opacity: 0.85 },
        xaxis: {
          type: 'numeric',
          min: 11.0,
          max: 16.0,
          tickAmount: 5,
          title: {
            text: 'Eksposur / Sum Insured (Skala Logaritmik, IDR)',
            style: { fontSize: '13px', fontWeight: 700, color: textColor }
          },
          labels: {
            show: true,
            style: {
              colors: textColor,
              fontSize: '11px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600
            },
            formatter: function (val) {
              return "10^" + val;
            }
          },
          axisBorder: {
            show: true,
            color: borderColor
          },
          axisTicks: {
            show: true,
            color: borderColor
          }
        },
        yaxis: {
          max: 100,
          min: 0,
          tickAmount: 5,
          title: {
            text: 'Gross Loss Ratio (%)',
            style: { fontSize: '13px', fontWeight: 700, color: textColor }
          },
          labels: {
            show: true,
            style: {
              colors: textColor,
              fontSize: '11px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600
            },
            formatter: function (val) { return val + "%"; }
          },
          axisBorder: {
            show: true,
            color: borderColor
          },
          axisTicks: {
            show: true,
            color: borderColor
          }
        },
        colors: ['#ef4444', '#10b981', '#0284c7', '#ea580c'], // Critical = Red, Strategic = Green, Stable = Blue, Inefficient = Orange
        grid: { borderColor: borderColor },
        annotations: {
          position: 'front',
          yaxis: [{
            y: 60.0,
            borderColor: '#64748b',
            borderWidth: 1.5,
            strokeDashArray: 4,
            label: {
              borderColor: 'transparent',
              style: { color: '#64748b', background: 'transparent', fontSize: '10px', fontWeight: 700 },
              text: 'Loss Ratio Threshold (60%)',
              position: 'left',
              offsetX: 10,
              offsetY: -8
            }
          }],
          xaxis: [{
            x: 13.8565, // log10 of 71.85 Trillion is 13.8565
            borderColor: '#64748b',
            borderWidth: 1.5,
            strokeDashArray: 4,
            label: {
              borderColor: 'transparent',
              orientation: 'vertical',
              style: { color: '#64748b', background: 'transparent', fontSize: '10px', fontWeight: 700 },
              text: 'Median Exposure Threshold',
              position: 'top',
              offsetX: -10,
              offsetY: 10
            }
          }],
          points: [
            {
              x: 12.6,
              y: 93,
              marker: { size: 0 },
              label: {
                borderColor: 'transparent',
                style: { color: isDark ? '#f97316' : '#ea580c', background: 'transparent', fontSize: '11px', fontWeight: 800 },
                text: 'INEFFICIENT SEGMENT'
              }
            },
            {
              x: 12.6,
              y: 90,
              marker: { size: 0 },
              label: {
                borderColor: 'transparent',
                style: { color: isDark ? '#9ca3af' : '#64748b', background: 'transparent', fontSize: '9px', fontWeight: 600 },
                text: '(Low Exposure, High Loss)'
              }
            },
            {
              x: 14.7,
              y: 93,
              marker: { size: 0 },
              label: {
                borderColor: 'transparent',
                style: { color: isDark ? '#f43f5e' : '#e11d48', background: 'transparent', fontSize: '11px', fontWeight: 800 },
                text: 'CRITICAL RISK'
              }
            },
            {
              x: 14.7,
              y: 90,
              marker: { size: 0 },
              label: {
                borderColor: 'transparent',
                style: { color: isDark ? '#9ca3af' : '#64748b', background: 'transparent', fontSize: '9px', fontWeight: 600 },
                text: '(High Exposure, High Loss)'
              }
            },
            {
              x: 12.6,
              y: 13,
              marker: { size: 0 },
              label: {
                borderColor: 'transparent',
                style: { color: isDark ? '#38bdf8' : '#0284c7', background: 'transparent', fontSize: '11px', fontWeight: 800 },
                text: 'STABLE SEGMENT'
              }
            },
            {
              x: 12.6,
              y: 10,
              marker: { size: 0 },
              label: {
                borderColor: 'transparent',
                style: { color: isDark ? '#9ca3af' : '#64748b', background: 'transparent', fontSize: '9px', fontWeight: 600 },
                text: '(Low Exposure, Low Loss)'
              }
            },
            {
              x: 14.7,
              y: 13,
              marker: { size: 0 },
              label: {
                borderColor: 'transparent',
                style: { color: isDark ? '#34d399' : '#16a34a', background: 'transparent', fontSize: '11px', fontWeight: 800 },
                text: 'STRATEGIC SEGMENT'
              }
            },
            {
              x: 14.7,
              y: 10,
              marker: { size: 0 },
              label: {
                borderColor: 'transparent',
                style: { color: isDark ? '#9ca3af' : '#64748b', background: 'transparent', fontSize: '9px', fontWeight: 600 },
                text: '(High Exposure, Low Loss)'
              }
            }
          ]
        },
        tooltip: {
          custom: function ({ series, seriesIndex, dataPointIndex, w }) {
            const item = w.config.series[seriesIndex].data[dataPointIndex];
            return `
              <div class="bubble-tooltip-card" style="padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: var(--shadow-md); color: var(--text-main);">
                <div style="font-weight: 800; font-size: 14px; color: var(--text-title); border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px;">
                  ${item.name} <span style="font-size: 10px; font-weight:600; padding: 2px 6px; border-radius: 4px; background: var(--primary-light); color: var(--primary); margin-left: 6px;">${item.risk}</span>
                </div>
                <div style="font-size: 12px; line-height: 1.4;">
                  <strong>GWP (Volume Bisnis):</strong> ${formatCurrency(item.gwpRaw)}<br/>
                  <strong>Eksposur:</strong> ${formatCurrency(item.exposureRaw)}<br/>
                  <strong>Total Klaim:</strong> ${formatCurrency(item.claimsRaw)}<br/>
                  <strong>Gross Loss Ratio:</strong> <span style="font-weight: 700; color: ${item.y >= 60 ? 'var(--color-critical)' : 'var(--color-stable)'}">${item.y}%</span>
                </div>
              </div>
            `;
          }
        },
        theme: { mode: chartMode }
      };

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [cobList, theme]);

  return <div ref={chartRef}></div>;
};

const NotebookRiskBubbleChart = ({ cobList, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !cobList || cobList.length === 0) return;

    const isDark = theme === "dark";
    const textColor = isDark ? "#9ca3af" : "#334155";
    const borderColor = isDark ? "#374151" : "#cbd5e1";
    const chartMode = isDark ? "dark" : "light";
    const lossRatioThreshold = 60;
    const exposureValues = cobList.map(item => item.exposure).filter(val => val > 0);
    const exposureThreshold = calculateMedian(exposureValues);
    const minExposure = Math.min(...exposureValues);
    const maxExposure = Math.max(...exposureValues);
    const xMin = Math.log10(minExposure * 0.1);
    const xMax = Math.log10(maxExposure * 10);
    const thresholdLog = Math.log10(exposureThreshold);
    const leftMidX = (xMin + thresholdLog) / 2;
    const rightMidX = (thresholdLog + xMax) / 2;
    const topMidY = (lossRatioThreshold + 110) / 2;
    const bottomMidY = lossRatioThreshold / 2;

    const palette = {
      "Critical Risk": "#e74c3c",
      "Strategic Segment": "#2ecc71",
      "Stable Segment": "#3498db",
      "Inefficient Segment": "#f39c12"
    };

    const seriesMap = {
      "Critical Risk": [],
      "Strategic Segment": [],
      "Stable Segment": [],
      "Inefficient Segment": []
    };

    cobList.forEach(item => {
      const point = {
        x: parseFloat(Math.log10(item.exposure).toFixed(4)),
        y: parseFloat(item.lossRatio.toFixed(2)),
        z: parseFloat((item.gwp / 1e9).toFixed(2)),
        name: item.cob,
        gwpRaw: item.gwp,
        exposureRaw: item.exposure,
        claimsRaw: item.grossClaims,
        claimCount: item.claimCount,
        risk: item.riskCategory
      };

      if (seriesMap[item.riskCategory]) {
        seriesMap[item.riskCategory].push(point);
      }
    });

    const options = {
      series: [
        { name: 'Critical Risk (High Exposure, High Loss)', data: seriesMap["Critical Risk"] },
        { name: 'Strategic Segment (High Exposure, Low Loss)', data: seriesMap["Strategic Segment"] },
        { name: 'Stable Segment (Low Exposure, Low Loss)', data: seriesMap["Stable Segment"] },
        { name: 'Inefficient Segment (Low Exposure, High Loss)', data: seriesMap["Inefficient Segment"] }
      ],
      chart: {
        height: 420,
        type: 'bubble',
        toolbar: { show: true },
        background: 'transparent',
        foreColor: textColor,
        fontFamily: "'Inter', 'Nunito', sans-serif"
      },
      plotOptions: {
        bubble: {
          minBubbleRadius: 14,
          maxBubbleRadius: 42
        }
      },
      stroke: {
        width: 1.5,
        colors: isDark ? ['#1f2937'] : ['#ffffff']
      },
      dataLabels: {
        enabled: false,
        style: {
          fontSize: '11px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          colors: [isDark ? '#e2e8f0' : '#0f172a']
        },
        background: {
          enabled: true,
          foreColor: isDark ? '#e2e8f0' : '#0f172a',
          padding: 4,
          borderRadius: 3,
          borderWidth: 1,
          borderColor: '#94a3b8',
          opacity: 0.95,
          backgroundColor: isDark ? '#0f172a' : '#ffffff'
        }
      },
      fill: { opacity: 0.85 },
      xaxis: {
        type: 'numeric',
        min: xMin,
        max: xMax,
        tickAmount: Math.max(4, Math.ceil(xMax - xMin)),
        title: {
          text: 'Eksposur / Sum Insured (Skala Logaritmik, IDR)',
          style: { fontSize: '13px', fontWeight: 700, color: textColor }
        },
        labels: {
          show: true,
          style: {
            colors: textColor,
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600
          },
          formatter: function (val) {
            return formatExposureCompact(Math.pow(10, val));
          }
        },
        axisBorder: {
          show: true,
          color: borderColor
        },
        axisTicks: {
          show: true,
          color: borderColor
        }
      },
      yaxis: {
        max: 110,
        min: 0,
        tickAmount: 6,
        title: {
          text: 'Gross Loss Ratio (%)',
          style: { fontSize: '13px', fontWeight: 700, color: textColor }
        },
        labels: {
          show: true,
          style: {
            colors: textColor,
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600
          },
          formatter: function (val) { return val + "%"; }
        },
        axisBorder: {
          show: true,
          color: borderColor
        },
        axisTicks: {
          show: true,
          color: borderColor
        }
      },
      colors: [
        palette["Critical Risk"],
        palette["Strategic Segment"],
        palette["Stable Segment"],
        palette["Inefficient Segment"]
      ],
      grid: { borderColor: borderColor },
      annotations: {
        position: 'front',
        yaxis: [{
          y: lossRatioThreshold,
          borderColor: '#64748b',
          borderWidth: 1.5,
          strokeDashArray: 4,
          label: {
            borderColor: 'transparent',
            style: { color: '#64748b', background: 'transparent', fontSize: '10px', fontWeight: 700 },
            text: `Loss Ratio Threshold (${lossRatioThreshold}%)`,
            position: 'left',
            offsetX: 10,
            offsetY: -8
          }
        }],
        xaxis: [{
          x: thresholdLog,
          borderColor: '#64748b',
          borderWidth: 1.5,
          strokeDashArray: 4,
          label: {
            borderColor: 'transparent',
            orientation: 'vertical',
            style: { color: '#64748b', background: 'transparent', fontSize: '10px', fontWeight: 700 },
            text: `Median Exposure (${formatExposureCompact(exposureThreshold)})`,
            position: 'top',
            offsetX: -10,
            offsetY: 10
          }
        }],
        points: [
          { x: leftMidX, y: topMidY + 5, marker: { size: 0 }, label: { borderColor: 'transparent', style: { color: isDark ? '#f97316' : '#ea580c', background: 'transparent', fontSize: '11px', fontWeight: 800 }, text: 'INEFFICIENT SEGMENT' } },
          { x: leftMidX, y: topMidY, marker: { size: 0 }, label: { borderColor: 'transparent', style: { color: isDark ? '#9ca3af' : '#64748b', background: 'transparent', fontSize: '9px', fontWeight: 600 }, text: '(Low Exposure, High Loss)' } },
          { x: rightMidX, y: topMidY + 5, marker: { size: 0 }, label: { borderColor: 'transparent', style: { color: isDark ? '#f43f5e' : '#e11d48', background: 'transparent', fontSize: '11px', fontWeight: 800 }, text: 'CRITICAL RISK' } },
          { x: rightMidX, y: topMidY, marker: { size: 0 }, label: { borderColor: 'transparent', style: { color: isDark ? '#9ca3af' : '#64748b', background: 'transparent', fontSize: '9px', fontWeight: 600 }, text: '(High Exposure, High Loss)' } },
          { x: leftMidX, y: bottomMidY + 5, marker: { size: 0 }, label: { borderColor: 'transparent', style: { color: isDark ? '#38bdf8' : '#0284c7', background: 'transparent', fontSize: '11px', fontWeight: 800 }, text: 'STABLE SEGMENT' } },
          { x: leftMidX, y: bottomMidY, marker: { size: 0 }, label: { borderColor: 'transparent', style: { color: isDark ? '#9ca3af' : '#64748b', background: 'transparent', fontSize: '9px', fontWeight: 600 }, text: '(Low Exposure, Low Loss)' } },
          { x: rightMidX, y: bottomMidY + 5, marker: { size: 0 }, label: { borderColor: 'transparent', style: { color: isDark ? '#34d399' : '#16a34a', background: 'transparent', fontSize: '11px', fontWeight: 800 }, text: 'STRATEGIC SEGMENT' } },
          { x: rightMidX, y: bottomMidY, marker: { size: 0 }, label: { borderColor: 'transparent', style: { color: isDark ? '#9ca3af' : '#64748b', background: 'transparent', fontSize: '9px', fontWeight: 600 }, text: '(High Exposure, Low Loss)' } },
          ...cobList.map(item => {
            const offsets = {
              "COB 6": { offsetX: 18, offsetY: -10 },
              "COB 4": { offsetX: -18, offsetY: 8 },
              "COB 9": { offsetX: 14, offsetY: -8 },
              "COB 10": { offsetX: 14, offsetY: -8 },
              "COB 1": { offsetX: -14, offsetY: -8 },
              "COB 8": { offsetX: 14, offsetY: -8 },
              "COB 5": { offsetX: -14, offsetY: -8 },
              "COB 3": { offsetX: 0, offsetY: 14 },
              "COB 2": { offsetX: 14, offsetY: -8 },
              "COB 7": { offsetX: 0, offsetY: 14 }
            }[item.cob] || { offsetX: 0, offsetY: -8 };

            return {
              x: parseFloat(Math.log10(item.exposure).toFixed(4)),
              y: parseFloat(item.lossRatio.toFixed(2)),
              marker: { size: 0 },
              label: {
                text: item.cob,
                offsetX: offsets.offsetX,
                offsetY: offsets.offsetY,
                borderColor: '#94a3b8',
                style: {
                  color: isDark ? '#e2e8f0' : '#0f172a',
                  background: isDark ? '#0f172a' : '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800
                }
              }
            };
          })
        ]
      },
      legend: { show: false },
      tooltip: {
        custom: function ({ seriesIndex, dataPointIndex, w }) {
          const item = w.config.series[seriesIndex].data[dataPointIndex];
          return `
            <div class="bubble-tooltip-card" style="padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: var(--shadow-md); color: var(--text-main);">
              <div style="font-weight: 800; font-size: 14px; color: var(--text-title); border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px;">
                ${item.name} <span style="font-size: 10px; font-weight:600; padding: 2px 6px; border-radius: 4px; background: var(--primary-light); color: var(--primary); margin-left: 6px;">${item.risk}</span>
              </div>
              <div style="font-size: 12px; line-height: 1.4;">
                <strong>GWP (Volume Bisnis):</strong> ${formatCurrency(item.gwpRaw)}<br/>
                <strong>Eksposur:</strong> ${formatCurrency(item.exposureRaw)}<br/>
                <strong>Total Klaim:</strong> ${formatCurrency(item.claimsRaw)}<br/>
                <strong>Jumlah Klaim:</strong> ${(item.claimCount || 0).toLocaleString('id-ID')}<br/>
                <strong>Gross Loss Ratio:</strong> <span style="font-weight: 700; color: ${item.y >= lossRatioThreshold ? 'var(--color-critical)' : 'var(--color-stable)'}">${item.y}%</span>
              </div>
            </div>
          `;
        }
      },
      theme: { mode: chartMode }
    };

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    chartInstance.current = new ApexCharts(chartRef.current, options);
    chartInstance.current.render();

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [cobList, theme]);

  return <div ref={chartRef}></div>;
};


// --- Component: Reinsurance Claim Relief by COB ---
const ReinsuranceClaimReliefChart = ({ cobShares, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && cobShares) {
      const isDark = theme === "dark";
      const textColor = isDark ? "#9ca3af" : "#4f5d73";
      const borderColor = isDark ? "#374151" : "#eceff5";
      const chartMode = isDark ? "dark" : "light";

      const withRelief = cobShares.map(d => {
        const grossClaims = (d.grossLossRatio / 100) * d.gwp;
        const nwp = d.gwp * (1 - d.cessionRate / 100);
        const netClaims = (d.netLossRatio / 100) * nwp;
        const claimReliefPct = grossClaims > 0
          ? Math.max(0, ((grossClaims - netClaims) / grossClaims) * 100)
          : 0;
        return { ...d, claimReliefPct: parseFloat(claimReliefPct.toFixed(2)) };
      });

      const sorted = [...withRelief].sort((a, b) => b.claimReliefPct - a.claimReliefPct);

      const options = {
        series: [{
          name: 'Claim Relief (% of Gross Claim)',
          data: sorted.map(d => d.claimReliefPct)
        }],
        chart: {
          type: 'bar',
          height: 320,
          toolbar: { show: false },
          background: 'transparent',
          foreColor: textColor,
          fontFamily: "'Inter', sans-serif"
        },
        plotOptions: {
          bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 }
        },
        dataLabels: { enabled: false },
        stroke: { show: false },
        xaxis: {
          categories: sorted.map(d => d.cob),
          labels: { style: { colors: textColor, fontSize: '11px', fontWeight: 600 } }
        },
        yaxis: {
          title: { text: 'Claim Relief (% of Gross Claim)', style: { color: textColor, fontSize: '11px' } },
          labels: {
            formatter: (val) => val.toFixed(0) + '%',
            style: { colors: textColor }
          },
          max: 60
        },
        colors: ['#22c55e'],
        grid: { borderColor: borderColor },
        theme: { mode: chartMode },
        tooltip: {
          y: { formatter: (val) => val.toFixed(2) + '% of Gross Claim' }
        },
        legend: { show: false }
      };

      if (chartInstance.current) chartInstance.current.destroy();
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }
    return () => {
      if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
    };
  }, [cobShares, theme]);

  return <div ref={chartRef}></div>;
};

// --- Component: Gross vs Net Loss Ratio by COB ---
const GrossNetLossRatioChart = ({ cobShares, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && cobShares) {
      const isDark = theme === "dark";
      const textColor = isDark ? "#9ca3af" : "#4f5d73";
      const borderColor = isDark ? "#374151" : "#eceff5";
      const chartMode = isDark ? "dark" : "light";

      // Sort by Gross LR descending
      const sorted = [...cobShares].sort((a, b) => b.grossLossRatio - a.grossLossRatio);

      const options = {
        series: [
          { name: 'Gross Loss Ratio (%)', data: sorted.map(d => parseFloat(d.grossLossRatio.toFixed(2))) },
          { name: 'Net Loss Ratio (%)',   data: sorted.map(d => parseFloat(d.netLossRatio.toFixed(2))) }
        ],
        chart: {
          type: 'bar',
          height: 320,
          toolbar: { show: false },
          background: 'transparent',
          foreColor: textColor,
          fontFamily: "'Inter', sans-serif"
        },
        plotOptions: {
          bar: { horizontal: false, columnWidth: '60%', borderRadius: 4 }
        },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: {
          categories: sorted.map(d => d.cob),
          labels: { style: { colors: textColor, fontSize: '11px', fontWeight: 600 } }
        },
        yaxis: {
          title: { text: 'Loss Ratio (%)', style: { color: textColor, fontSize: '11px' } },
          labels: {
            formatter: (val) => val.toFixed(0) + '%',
            style: { colors: textColor }
          }
        },
        colors: ['#ef4444', '#f97316'],
        grid: { borderColor: borderColor },
        theme: { mode: chartMode },
        tooltip: {
          shared: true,
          intersect: false,
          y: { formatter: (val) => val.toFixed(2) + '%' }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'center',
          fontSize: '11px',
          labels: { colors: textColor }
        }
      };

      if (chartInstance.current) chartInstance.current.destroy();
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }
    return () => {
      if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
    };
  }, [cobShares, theme]);

  return <div ref={chartRef}></div>;
};

// --- Component: Overview Section ---
const OverviewSection = ({ data, theme }) => {
  return (
    <div>
      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <div className="metric-card gradient-gwp">
          <div className="metric-header">
            <span className="metric-title">
              Gross Written Premium (GWP)
              <InfoTooltip 
                title="Gross Written Premium (GWP)" 
                info="Total pendapatan premi kotor yang diterima oleh perusahaan sebelum dikurangi premi yang diserahkan untuk reasuransi." 
                formula="Sum(GWP_IDR) dari sheet 'Raw Premium'" 
                left={true}
              />
            </span>
            <div className="metric-icon-box"><i className="fas fa-wallet"></i></div>
          </div>
          <div className="metric-value">{formatCurrency(data.overall.gwp)}</div>
          <div className="metric-footer">
            <i className="fas fa-arrow-trend-up trend-up"></i>
            <span>Total premi kotor portofolio</span>
          </div>
        </div>

        <div className="metric-card gradient-nwp">
          <div className="metric-header">
            <span className="metric-title">
              Net Premium
              <InfoTooltip 
                title="Net Premium" 
                info="Pendapatan premi bersih setelah dikurangi porsi premi yang dialihkan/diserahkan ke reasuradur." 
                formula="Gross Written Premium - Reinsurance Ceded Premium" 
                left={true}
              />
            </span>
            <div className="metric-icon-box"><i className="fas fa-briefcase"></i></div>
          </div>
          <div className="metric-value">{formatCurrency(data.overall.nwp)}</div>
          <div className="metric-footer">
            <i className="fas fa-arrow-trend-up trend-up"></i>
            <span>{data.overall.reCededPct ? (100 - data.overall.reCededPct).toFixed(2) : "78.23"}% Premi ditahan sendiri</span>
          </div>
        </div>

        <div className="metric-card gradient-exposure">
          <div className="metric-header">
            <span className="metric-title">
              Total Sum Insured (Exposure)
              <InfoTooltip 
                title="Total Sum Insured (Exposure)" 
                info="Akumulasi nilai pertanggungan finansial maksimum atas seluruh risiko yang dijamin dalam portofolio." 
                formula="Sum(SUM_INSURED) dari sheet 'Raw Premium'" 
                left={true}
              />
            </span>
            <div className="metric-icon-box"><i className="fas fa-shield-halved"></i></div>
          </div>
          <div className="metric-value">{formatCurrency(data.overall.exposure)}</div>
          <div className="metric-footer">
            <i className="fas fa-umbrella trend-neutral"></i>
            <span>Total risiko uang pertanggungan</span>
          </div>
        </div>

        <div className="metric-card gradient-policies">
          <div className="metric-header">
            <span className="metric-title">
              Total Policies
              <InfoTooltip 
                title="Total Policies" 
                info="Total kontrak/polis asuransi aktif yang tercatat dalam sistem selama periode analisis." 
                formula="Jumlah baris unik (POL_NO) dari sheet 'Raw Premium'" 
                left={true}
              />
            </span>
            <div className="metric-icon-box"><i className="fas fa-file-signature"></i></div>
          </div>
          <div className="metric-value">{data.overall.totalPolicies ? data.overall.totalPolicies.toLocaleString("id-ID") : "-"}</div>
          <div className="metric-footer">
            <i className="fas fa-folder-open trend-up"></i>
            <span>Total polis aktif portofolio</span>
          </div>
        </div>

        <div className="metric-card gradient-claims">
          <div className="metric-header">
            <span className="metric-title">
              Gross Incurred Claims
              <InfoTooltip 
                title="Gross Incurred Claims" 
                info="Jumlah klaim kotor yang terjadi selama tahun berjalan, baik yang sudah dibayar (Settled) maupun yang masih dalam proses (Outstanding)." 
                formula="Sum(GRS_ST_IDR + GRS_OS_IDR) dari sheet 'Raw Claim'" 
                left={true}
              />
            </span>
            <div className="metric-icon-box"><i className="fas fa-receipt"></i></div>
          </div>
          <div className="metric-value">{formatCurrency(data.overall.grossIncurred)}</div>
          <div className="metric-footer">
            <i className="fas fa-circle-exclamation trend-down"></i>
            <span>Paid + Outstanding kotor</span>
          </div>
        </div>

        <div className="metric-card gradient-net-claims">
          <div className="metric-header">
            <span className="metric-title">
              Net Claim
              <InfoTooltip 
                title="Net Claim" 
                info="Beban klaim bersih yang ditanggung sendiri oleh AXA setelah dikurangi bagian klaim yang ditanggung oleh reasuradur." 
                formula="Gross Incurred Claims - Reinsurance Recovery" 
                left={true}
              />
            </span>
            <div className="metric-icon-box"><i className="fas fa-file-invoice-dollar"></i></div>
          </div>
          <div className="metric-value">{formatCurrency(data.overall.netIncurred)}</div>
          <div className="metric-footer">
            <i className="fas fa-circle-exclamation trend-down"></i>
            <span>92.81% Beban klaim ditahan</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">
              Gross Loss Ratio
              <InfoTooltip 
                title="Gross Loss Ratio" 
                info="Rasio total beban klaim kotor terhadap premi kotor, mencerminkan kinerja teknis portofolio dasar." 
                formula="(Gross Incurred Claims / Gross Written Premium) * 100%" 
                left={false}
              />
            </span>
            <div className="metric-icon-box"><i className="fas fa-percent"></i></div>
          </div>
          <div className="metric-value" style={{ color: 'var(--color-stable)' }}>{data.overall.grossLossRatio}%</div>
          <div className="metric-footer">
            <i className="fas fa-check-circle trend-up"></i>
            <span className="trend-up">Rentang sehat (&lt; 60%)</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">
              Net Loss Ratio
              <InfoTooltip 
                title="Net Loss Ratio" 
                info="Rasio beban klaim bersih terhadap premi bersih ditahan, mengukur kesehatan finansial portofolio setelah memperhitungkan reasuransi." 
                formula="(Net Claim / Net Premium) * 100%" 
                left={false}
              />
            </span>
            <div className="metric-icon-box"><i className="fas fa-scale-unbalanced"></i></div>
          </div>
          <div className="metric-value" style={{ color: 'var(--color-critical)' }}>{data.overall.netLossRatio}%</div>
          <div className="metric-footer">
            <i className="fas fa-arrow-trend-up trend-down"></i>
            <span className="trend-down">Naik +9.20% (Ketidakefisienan)</span>
          </div>
        </div>

        <div className="metric-card gradient-uw-result">
          <div className="metric-header">
            <span className="metric-title">
              Net UW Result
              <InfoTooltip 
                title="Net Underwriting Result" 
                info="Keuntungan atau kerugian teknis underwriting setelah memperhitungkan premi bersih, klaim bersih, dan komisi bersih, sesuai definisi di notebook analisis." 
                formula="Net Premium - Net Claim - Net Commission" 
                left={false}
              />
            </span>
            <div className="metric-icon-box"><i className="fas fa-chart-line"></i></div>
          </div>
          <div className="metric-value">{formatCurrency(data.overall.netUwResult || 0)}</div>
          <div className="metric-footer">
            <i className="fas fa-trophy trend-up"></i>
            <span>Net Premium dikurangi Net Claim dan Net Commission</span>
          </div>
        </div>
      </div>

      {/* Row 2: Reinsurance & Column Chart */}
      <div className="dashboard-row-2">
        <div className="card">
          <div className="card-header">
            <h3>
              <i className="fas fa-scale-unbalanced-flip"></i> Efikasi Reasuransi
              <InfoTooltip
                title="Efikasi Reasuransi"
                info="Ringkasan inefisiensi pengalihan risiko ke reasuradur (premi yang diserahkan tidak sebanding dengan pemulihan klaim)."
                formula="Rasio Premi Ceded & Rasio Klaim Recovery"
                left={true}
              />
            </h3>
          </div>
          <div className="card-body">
            <div className="efficacy-summary">
              <p style={{ fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '0.5rem' }}>
                Terjadi ketimpangan transfer risiko yang merugikan profitabilitas bersih perusahaan:
              </p>
              
              <div className="efficacy-stat-box">
                <div className="efficacy-stat-info">
                  <h5>Premi Diserahkan (RWP)</h5>
                  <p>{formatCurrency(data.overall.rwp)}</p>
                </div>
                <span className="efficacy-badge" style={{ backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)' }}>
                  {data.overall.reCededPct}% dari GWP
                </span>
              </div>
              
              <div className="efficacy-stat-box">
                <div className="efficacy-stat-info">
                  <h5>Pemulihan Klaim (RI)</h5>
                  <p>{formatCurrency(data.overall.riRecovery)}</p>
                </div>
                <span className="efficacy-badge" style={{ backgroundColor: 'var(--color-inefficient-bg)', color: 'var(--color-inefficient)' }}>
                  {data.overall.reRecoveryPct}% dari Klaim
                </span>
              </div>

              <div className="executive-alert" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                <div className="executive-alert-icon"><i className="fas fa-triangle-exclamation"></i></div>
                <div className="executive-alert-content">
                  <h4>Rekomendasi Reasuransi</h4>
                  <p style={{ fontSize: '0.8rem' }}>Struktur proporsional kurang optimal. Reasuradur memperoleh keuntungan sepihak. Segera tinjau retensi sendiri dan beralih ke Excess of Loss.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>
              <i className="fas fa-chart-column"></i> Perbandingan Profil Finansial (Gross vs Ceded vs Net)
              <InfoTooltip
                title="Perbandingan Profil Finansial"
                info="Visualisasi perbandingan keseluruhan nilai GWP, Net Premium, RWP (Premi diserahkan), Gross Claims, dan Net Claim untuk melihat struktur portofolio."
                formula="Gross & Net Financial metrics comparison"
                left={false}
              />
            </h3>
          </div>
          <div className="card-body">
            <ReinsuranceChart data={data.overall} theme={theme} />
          </div>
        </div>
      </div>

      {/* Row 4: Reinsurance Claim Relief + Gross vs Net LR by COB */}
      <div className="dashboard-row-equal" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>
              <i className="fas fa-hand-holding-dollar"></i> Reinsurance Claim Relief by COB
              <InfoTooltip
                title="Reinsurance Claim Relief"
                info="Porsi pemulihan beban klaim oleh reasuradur untuk setiap Class of Business (COB). Nilai persentase menunjukkan seberapa besar klaim yang diserap reasuradur."
                formula="(Gross Claims − Net Claims) / Gross Claims × 100 per COB"
                left={true}
              />
            </h3>
          </div>
          <div className="card-body">
            <ReinsuranceClaimReliefChart cobShares={data.cobShares} theme={theme} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>
              <i className="fas fa-scale-balanced"></i> Gross vs Net Loss Ratio by COB
              <InfoTooltip
                title="Gross vs Net Loss Ratio per COB"
                info="Perbandingan rasio klaim sebelum reasuransi (Gross) dengan setelah reasuransi (Net). Jika Net LR lebih tinggi dari Gross LR, reasuransi dinilai tidak efisien."
                formula="Gross Loss Ratio vs Net Loss Ratio per COB"
                left={false}
              />
            </h3>
          </div>
          <div className="card-body">
            <GrossNetLossRatioChart cobShares={data.cobShares} theme={theme} />
          </div>
        </div>
      </div>

      {/* Row 5: Claim Severity per COB */}
      <div className="card full-width-row" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3>
            <i className="fas fa-hand-holding-medical"></i> Rata-rata Keparahan Klaim (Claim Severity) per COB
            <InfoTooltip
              title="Claim Severity per COB"
              info="Rata-rata besaran nilai klaim kotor per kejadian klaim (dalam Juta IDR). Chip di bawah dapat digunakan sebagai filter interaktif untuk memfokuskan analisis."
              formula="Total Gross Claims / Claim Count"
              left={true}
            />
          </h3>
        </div>
        <div className="card-body">
          <ClaimSeverityChart cobPortfolio={data.cobPortfolio} theme={theme} />
        </div>
      </div>

      {/* Row 3: Root Cause & Indikator */}
      <div className="dashboard-row-3" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>
              <i className="fas fa-bullseye"></i> Akar Masalah Portofolio (Worst Segments Summary)
              <InfoTooltip
                title="Akar Masalah Portofolio"
                info="Segmen bisnis yang memberikan kontribusi kerugian paling signifikan terhadap total portofolio."
                formula="Penyaringan kontribusi klaim & Loss Ratio ekstrim"
                left={true}
              />
            </h3>
          </div>
          <div className="card-body">
            <p style={{ lineHeight: '1.5', fontSize: '0.92rem', marginBottom: '1.2rem' }}>
              Kerugian portofolio AXA <strong>tidak tersebar merata</strong>, melainkan terkonsentrasi secara kritis pada produk tertentu di daerah spesifik melalui kanal distribusi tertentu:
            </p>
            
            <div className="root-cause-cards-grid">
              <div className="root-cause-card primary">
                <div className="root-cause-subtext">Akar Masalah Utama</div>
                <h4>PRODUCT1217</h4>
                <div className="root-cause-metrics">
                  <div className="rc-metric">
                    <h5>Lokasi & Channel</h5>
                    <p>Branch K × Channel B</p>
                  </div>
                  <div className="rc-metric">
                    <h5>Gross Loss Ratio</h5>
                    <p style={{ color: 'var(--color-critical)' }}>21,083.37%</p>
                  </div>
                </div>
                <p className="root-cause-desc">Premi hanya IDR 1.74 Miliar menghasilkan klaim fantastis <strong>IDR 366.46 Miliar</strong>. Menyumbang 29.58% total klaim portofolio.</p>
              </div>
              
              <div className="root-cause-card secondary">
                <div className="root-cause-subtext">Akar Masalah Kedua</div>
                <h4>PRODUCT0221</h4>
                <div className="root-cause-metrics">
                  <div className="rc-metric">
                    <h5>Lokasi & Channel</h5>
                    <p>Branch K × Channel B</p>
                  </div>
                  <div className="rc-metric">
                    <h5>Gross Loss Ratio</h5>
                    <p style={{ color: 'var(--color-inefficient)' }}>1,764.93%</p>
                  </div>
                </div>
                <p className="root-cause-desc">Premi IDR 10.08 Miliar menghasilkan klaim <strong>IDR 177.95 Miliar</strong>. Menyumbang 14.36% total klaim portofolio.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>
              <i className="fas fa-tags"></i> Kategori Risiko COB
              <InfoTooltip
                title="Kategori Risiko COB"
                info="Pengelompokan 10 Class of Business (COB) ke dalam 4 kategori risiko berdasarkan profitabilitas dan paparan eksposur."
                formula="Klasifikasi kuadran matriks portofolio"
                left={false}
              />
            </h3>
          </div>
          <div className="card-body" style={{ padding: '1.2rem 1.8rem' }}>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}><i className="fas fa-circle-exclamation" style={{ color: 'var(--color-critical)', marginRight: '8px' }}></i> Critical Risk</span>
                <span className="status-badge badge-critical">COB 6, COB 4</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}><i className="fas fa-lightbulb" style={{ color: 'var(--color-strategic)', marginRight: '8px' }}></i> Strategic Segment</span>
                <span className="status-badge badge-strategic">COB 9, COB 10, COB 1</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}><i className="fas fa-circle-chevron-down" style={{ color: 'var(--color-inefficient)', marginRight: '8px' }}></i> Inefficient Segment</span>
                <span className="status-badge badge-inefficient">COB 7</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}><i className="fas fa-shield-heart" style={{ color: 'var(--color-stable)', marginRight: '8px' }}></i> Stable Segment</span>
                <span className="status-badge badge-stable">COB 8, COB 5, COB 3, COB 2</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Component: Risk Matrix Section ---
const RiskMatrixSection = ({ cobList, theme }) => {
  const exposureThreshold = useMemo(
    () => calculateMedian((cobList || []).map(item => item.exposure).filter(val => val > 0)),
    [cobList]
  );
  const riskGroups = useMemo(() => {
    const groups = {
      "Critical Risk": [],
      "Strategic Segment": [],
      "Inefficient Segment": [],
      "Stable Segment": []
    };

    (cobList || []).forEach(item => {
      if (groups[item.riskCategory]) {
        groups[item.riskCategory].push(item.cob);
      }
    });

    Object.keys(groups).forEach(key => groups[key].sort());
    return groups;
  }, [cobList]);

  return (
    <div>
      <div className="executive-alert" style={{ backgroundColor: 'var(--primary-light)', borderLeftColor: 'var(--primary)', marginBottom: '1.5rem' }}>
        <div className="executive-alert-icon" style={{ color: 'var(--primary)' }}><i className="fas fa-circle-info"></i></div>
        <div className="executive-alert-content">
          <h4>Metodologi Pemetaan Profil Risiko (Step 9)</h4>
          <p style={{ color: 'var(--text-main)' }}>
            Setiap Lini Bisnis / Class of Business (COB) diposisikan pada matriks 4 kuadran sesuai notebook Step 9. Sumbu X menunjukkan <strong>Eksposur (Sum Insured)</strong> dengan pemisah <strong>median eksposur COB sebesar {formatExposureCompact(exposureThreshold)}</strong>, sumbu Y mewakili <strong>Gross Loss Ratio (%)</strong> dengan ambang <strong>60%</strong>, dan ukuran gelembung melambangkan <strong>Gross Written Premium (GWP)</strong>. Gunakan hover pada gelembung untuk melihat detail metrik aktuaris.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>
            <i className="fas fa-circle-nodes"></i> Matriks Profil Risiko Class of Business (COB)
            <InfoTooltip
              title="Matriks Profil Risiko COB"
              info="Grafik gelembung 4 kuadran yang memetakan seluruh COB. Sumbu X menunjukkan total eksposur, sumbu Y mewakili Gross Loss Ratio %, dan ukuran gelembung melambangkan GWP."
              formula="Sumbu X: Exposure, Sumbu Y: Gross LR %, Gelembung: GWP"
              left={true}
            />
          </h3>
        </div>
        <div className="card-body">
          <div className="risk-matrix-layout">
            <div className="chart-wrapper">
              <h4 style={{ textAlign: 'center', margin: '5px 0 20px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-title)' }}>
                Peta Profil Risiko Portofolio AXA - Universitas Airlangga (Case 6)
              </h4>
              <NotebookRiskBubbleChart cobList={cobList} theme={theme} />
            </div>
            
            <div className="risk-quadrant-legend">
              <div className="quadrant-legend-card critical">
                <div className="quad-indicator crit"></div>
                <div className="quad-info">
                  <h5>Critical Risk (Kanan Atas)</h5>
                  <p>Eksposur besar & merugi (Loss Ratio &gt; 60%). Butuh restrukturisasi tarif & underwriting mendesak. ({riskGroups["Critical Risk"].join(", ") || "-"})</p>
                </div>
              </div>
              
              <div className="quadrant-legend-card strategic">
                <div className="quad-indicator strat"></div>
                <div className="quad-info">
                  <h5>Strategic Segment (Kanan Bawah)</h5>
                  <p>Eksposur besar namun sangat menguntungkan. Fokus pertumbuhan pangsa pasar & pertahankan klien. ({riskGroups["Strategic Segment"].join(", ") || "-"})</p>
                </div>
              </div>
              
              <div className="quadrant-legend-card inefficient">
                <div className="quad-indicator ineff"></div>
                <div className="quad-info">
                  <h5>Inefficient Segment (Kiri Atas)</h5>
                  <p>Volume bisnis kecil tapi merugikan. Perlu koreksi tarif premi atau perbaikan underwriting. ({riskGroups["Inefficient Segment"].join(", ") || "-"})</p>
                </div>
              </div>
              
              <div className="quadrant-legend-card stable">
                <div className="quad-indicator stab"></div>
                <div className="quad-info">
                  <h5>Stable Segment (Kiri Bawah)</h5>
                  <p>Volume bisnis kecil & menguntungkan. Menjaga kestabilan keuntungan margin asuransi. ({riskGroups["Stable Segment"].join(", ") || "-"})</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Component: Drill Down Section ---
const DrillDownSection = ({ rawData }) => {
  const [basis, setBasis] = useState("gross"); // "gross" or "net"
  const [drilldownType, setDrilldownType] = useState("cobBranchChannelProduct");
  const [search, setSearch] = useState("");
  const [cob, setCob] = useState("");
  const [branch, setBranch] = useState("");
  const [channel, setChannel] = useState("");
  const [product, setProduct] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const hasBranch = ["cobBranch", "cobBranchChannel", "cobBranchChannelProduct"].includes(drilldownType);
  const hasChannel = ["cobChannel", "cobBranchChannel", "cobBranchChannelProduct"].includes(drilldownType);
  const hasProduct = ["cobProduct", "cobBranchChannelProduct"].includes(drilldownType);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, cob, branch, channel, product, basis, drilldownType]);

  const segmentsData = useMemo(() => {
    if (!rawData || !rawData.worstSegments) return {};
    if (rawData.worstSegments.gross || rawData.worstSegments.net) {
      return rawData.worstSegments[basis] || {};
    }
    return rawData.worstSegments;
  }, [rawData, basis]);

  const filters = useMemo(() => {
    const cobs = new Set();
    const branches = new Set();
    const channels = new Set();
    const products = new Set();

    const granualData = segmentsData[drilldownType] || [];
    granualData.forEach(item => {
      if (item.cob) cobs.add(item.cob);
      if (item.branch) branches.add(item.branch);
      if (item.channel) channels.add(item.channel);
      const prod = item.product || item.product_name;
      if (prod) products.add(prod);
    });

    return {
      cobs: Array.from(cobs).sort(),
      branches: Array.from(branches).sort(),
      channels: Array.from(channels).sort(),
      products: Array.from(products).sort()
    };
  }, [segmentsData, drilldownType]);

  const filteredData = useMemo(() => {
    const query = search.toLowerCase().trim();
    const granualData = segmentsData[drilldownType] || [];
    const filtered = granualData.filter(item => {
      const prod = item.product || item.product_name || "";
      const matchQuery = 
        item.cob.toLowerCase().includes(query) ||
        (item.branch && item.branch.toLowerCase().includes(query)) ||
        (item.channel && item.channel.toLowerCase().includes(query)) ||
        (prod && prod.toLowerCase().includes(query)) ||
        (item.impact && item.impact.toLowerCase().includes(query));
      
      const matchCob = !cob || item.cob === cob;
      const matchBranch = !branch || item.branch === branch;
      const matchChannel = !channel || item.channel === channel;
      const matchProduct = !product || prod === product;

      return matchQuery && matchCob && matchBranch && matchChannel && matchProduct;
    });

    // Sort by Loss Ratio descending
    return filtered.sort((a, b) => {
      const lrA = basis === 'gross' ? (a.lossRatioGross ?? a.lossRatio) : (a.lossRatioNet ?? a.lossRatio);
      const lrB = basis === 'gross' ? (b.lossRatioGross ?? b.lossRatio) : (b.lossRatioNet ?? b.lossRatio);
      return lrB - lrA;
    });
  }, [search, cob, branch, channel, product, segmentsData, drilldownType, basis]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage]);

  const handleReset = () => {
    setSearch("");
    setCob("");
    setBranch("");
    setChannel("");
    setProduct("");
    setCurrentPage(1);
  };

  const handleTypeChange = (newType) => {
    setDrilldownType(newType);
    setSearch("");
    setCob("");
    setBranch("");
    setChannel("");
    setProduct("");
    setCurrentPage(1);
  };

  return (
    <div>
      <div className="filter-action-bar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
        
        {/* Basis selection row */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '0.2rem' }}>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: 'var(--text-title)', fontSize: '0.9rem' }}>
              <i className="fas fa-calculator" style={{ color: 'var(--primary)', marginRight: '6px' }}></i> Basis Analisis (Rumus):
            </span>
            <div className="strategy-tab-buttons" style={{ margin: 0, padding: '0.2rem', width: 'auto', display: 'inline-flex' }}>
              <button 
                className={`strat-tab-btn ${basis === 'gross' ? 'active' : ''}`} 
                onClick={() => setBasis('gross')}
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
              >
                Gross Basis (Kotor)
              </button>
              <button 
                className={`strat-tab-btn ${basis === 'net' ? 'active' : ''}`} 
                onClick={() => setBasis('net')}
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
              >
                Net Basis (Bersih)
              </button>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {basis === 'gross' ? (
              <span><i className="fas fa-info-circle"></i> Rumus: Loss Ratio = Gross Claims / GWP (Premi Kotor)</span>
            ) : (
              <span><i className="fas fa-info-circle"></i> Rumus: Loss Ratio = Net Claim / Net Premium</span>
            )}
          </div>
        </div>

        {/* Combinations selection row */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: 'var(--text-title)', fontSize: '0.9rem' }}>
            <i className="fas fa-layer-group" style={{ color: 'var(--primary)', marginRight: '6px' }}></i> Kombinasi Analisis:
          </span>
          <div className="strategy-tab-buttons" style={{ margin: 0, padding: '0.3rem', width: 'auto', flexGrow: 1 }}>
            <button className={`strat-tab-btn ${drilldownType === 'cobBranch' ? 'active' : ''}`} onClick={() => handleTypeChange('cobBranch')}>COB × Cabang</button>
            <button className={`strat-tab-btn ${drilldownType === 'cobChannel' ? 'active' : ''}`} onClick={() => handleTypeChange('cobChannel')}>COB × Channel</button>
            <button className={`strat-tab-btn ${drilldownType === 'cobProduct' ? 'active' : ''}`} onClick={() => handleTypeChange('cobProduct')}>COB × Produk</button>
            <button className={`strat-tab-btn ${drilldownType === 'cobBranchChannel' ? 'active' : ''}`} onClick={() => handleTypeChange('cobBranchChannel')}>COB × Cabang × Channel</button>
            <button className={`strat-tab-btn ${drilldownType === 'cobBranchChannelProduct' ? 'active' : ''}`} onClick={() => handleTypeChange('cobBranchChannelProduct')}>COB × Cabang × Channel × Produk</button>
          </div>
        </div>

        {/* Filters inputs row */}
        <div className="filter-inputs-group" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box-wrapper" style={{ flexGrow: 1, minWidth: '200px' }}>
            <i className="fas fa-search"></i>
            <input type="text" className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari segmen atau catatan..." />
          </div>
          
          <select className="select-filter" value={cob} onChange={e => setCob(e.target.value)}>
            <option value="">Semua COB</option>
            {filters.cobs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          {hasBranch && (
            <select className="select-filter" value={branch} onChange={e => setBranch(e.target.value)}>
              <option value="">Semua Cabang</option>
              {filters.branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
          
          {hasChannel && (
            <select className="select-filter" value={channel} onChange={e => setChannel(e.target.value)}>
              <option value="">Semua Channel</option>
              {filters.channels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          )}
          
          {hasProduct && (
            <select className="select-filter" value={product} onChange={e => setProduct(e.target.value)}>
              <option value="">Semua Produk</option>
              {filters.products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          <button className="reset-filter-btn" onClick={handleReset} style={{ height: '42px', padding: '0 1rem' }}>
            <i className="fas fa-rotate-left"></i> Reset Filter
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>
            <i className="fas fa-list-ol"></i> Segmen Terburuk Portofolio (Berdasarkan {basis === 'gross' ? 'Gross' : 'Net'} Loss Ratio Underwriting, GWP &gt; 100Juta)
            <InfoTooltip
              title="Tabel Root Cause Analysis"
              info="Rincian data portofolio dari tingkat COB hingga kombinasi cabang, channel, dan produk untuk melacak anomali kerugian."
              formula="Penyaringan data berdasar GWP > 100 Juta, diurutkan dari Loss Ratio tertinggi"
              left={true}
            />
          </h3>
        </div>
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <div className="table-responsive">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>COB</th>
                  {hasBranch && <th>Cabang</th>}
                  {hasChannel && <th>Channel</th>}
                  {hasProduct && <th>Nama Produk</th>}
                  <th>{basis === 'gross' ? 'GWP' : 'Net Premium'}</th>
                  <th>Eksposur (SI)</th>
                  <th>{basis === 'gross' ? 'Gross Claims' : 'Net Claim'}</th>
                  <th>Jumlah Klaim</th>
                  <th>{basis === 'gross' ? 'Gross Loss Ratio' : 'Net Loss Ratio'}</th>
                  <th>Catatan &amp; Dampak Aktuaris</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={hasBranch + hasChannel + hasProduct + 7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      <i className="fas fa-filter" style={{ fontSize: '1.8rem', marginBottom: '0.5rem', display: 'block' }}></i>
                      Data tidak ditemukan untuk kriteria filter ini.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, index) => {
                    const lr = basis === 'gross' ? (item.lossRatioGross ?? item.lossRatio) : (item.lossRatioNet ?? item.lossRatio);
                    const clm = basis === 'gross' ? item.grossClaims : item.netClaims;
                    const prem = basis === 'gross' ? item.gwp : item.nwp;

                    let badgeClass = "badge-stable";
                    if (lr >= 100) badgeClass = "badge-critical";
                    else if (lr >= 60) badgeClass = "badge-inefficient";
                    else if (prem > 5e10) badgeClass = "badge-strategic";

                    const prod = item.product || item.product_name;

                    return (
                      <tr key={index} className={lr > 1000 ? "highlight-root-cause" : ""}>
                        <td><span className={`status-badge ${badgeClass}`} style={{ fontSize: '0.75rem' }}>{item.cob}</span></td>
                        {hasBranch && <td><strong>{item.branch}</strong></td>}
                        {hasChannel && <td><span style={{ fontSize: '0.85rem' }}>{item.channel}</span></td>}
                        {hasProduct && <td><code style={{ fontSize: '0.85rem' }}>{prod}</code></td>}
                        <td>{formatCurrency(prem)}</td>
                        <td>{formatCurrency(item.exposure)}</td>
                        <td>{formatCurrency(clm)}</td>
                        <td>{item.claimCount.toLocaleString("id-ID")}</td>
                        <td style={{ color: lr >= 100 ? 'var(--color-critical)' : 'inherit', fontWeight: 700 }}>
                          {lr.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </td>
                        <td style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-title)' }}>
                          <i className="fas fa-circle-exclamation" style={{ marginRight: '4px', color: lr >= 100 ? 'var(--color-critical)' : 'var(--text-muted)' }}></i>
                          {item.impact || (lr >= 100 ? "Segmen Kerugian Ekstrem" : lr >= 60 ? "Perlu Pemantauan Underwriting" : "Performa Sehat")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-card-header)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Menampilkan <span style={{ color: 'var(--text-title)', fontWeight: 700 }}>{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)}</span> dari <span style={{ color: 'var(--text-title)', fontWeight: 700 }}>{totalItems}</span> segmen
          </div>
          
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              <button 
                className="reset-filter-btn" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                style={{ height: '34px', padding: '0 0.8rem', fontSize: '0.8rem', opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                <i className="fas fa-chevron-left" style={{ marginRight: '4px' }}></i> Sebelumnya
              </button>
              
              <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = currentPage;
                  if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  if (pageNum < 1 || pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`strat-tab-btn ${currentPage === pageNum ? 'active' : ''}`}
                      style={{ 
                        padding: '0 0.7rem', 
                        height: '34px', 
                        minWidth: '34px', 
                        fontSize: '0.8rem', 
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: 0
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button 
                className="reset-filter-btn" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                style={{ height: '34px', padding: '0 0.8rem', fontSize: '0.8rem', opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Berikutnya <i className="fas fa-chevron-right" style={{ marginLeft: '4px' }}></i>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// --- Component: Exposure Share Donut Chart ---
const ExposureShareDonutChart = ({ cobShares, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && cobShares) {
      const isDark = theme === "dark";
      const textColor = isDark ? "#9ca3af" : "#4f5d73";
      const chartMode = isDark ? "dark" : "light";

      const options = {
        series: cobShares.map(item => item.exposureShare),
        labels: cobShares.map(item => item.cob),
        chart: {
          type: 'donut',
          height: 320,
          background: 'transparent',
          foreColor: textColor,
          fontFamily: "'Inter', sans-serif"
        },
        stroke: {
          colors: [isDark ? '#1f2937' : '#ffffff']
        },
        plotOptions: {
          pie: {
            donut: {
              size: '65%',
              labels: {
                show: true,
                name: { show: true, fontSize: '14px', fontWeight: 600 },
                value: {
                  show: true,
                  fontSize: '16px',
                  fontWeight: 800,
                  formatter: (val) => val.toFixed(2) + '%'
                },
                total: {
                  show: true,
                  label: 'Total Eksposur',
                  formatter: () => '100.00%'
                }
              }
            }
          }
        },
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          fontSize: '12px',
          itemMargin: { horizontal: 6, vertical: 3 }
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => val.toFixed(1) + '%'
        },
        theme: { mode: chartMode },
        colors: ['#435ebe', '#5a8dee', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5']
      };

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [cobShares, theme]);

  return <div ref={chartRef}></div>;
};

// --- Component: Premium Risk ROL Chart ---
const PremiumRiskRolChart = ({ cobShares, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && cobShares) {
      const isDark = theme === "dark";
      const textColor = isDark ? "#9ca3af" : "#4f5d73";
      const borderColor = isDark ? "#374151" : "#eceff5";
      const chartMode = isDark ? "dark" : "light";

      const sortedShares = [...cobShares].sort((a, b) => b.exposureShare - a.exposureShare);

      const options = {
        series: [
          {
            name: 'Pangsa Premi (GWP Share %)',
            type: 'column',
            data: sortedShares.map(item => item.gwpShare)
          },
          {
            name: 'Pangsa Risiko (Exposure Share %)',
            type: 'column',
            data: sortedShares.map(item => item.exposureShare)
          },
          {
            name: 'Rate on Line (ROL %)',
            type: 'line',
            data: sortedShares.map(item => item.rol)
          }
        ],
        chart: {
          height: 320,
          type: 'line',
          toolbar: { show: false },
          background: 'transparent',
          foreColor: textColor,
          fontFamily: "'Inter', sans-serif"
        },
        stroke: {
          width: [0, 0, 3],
          curve: 'smooth'
        },
        plotOptions: {
          bar: {
            columnWidth: '55%',
            borderRadius: 4
          }
        },
        xaxis: {
          categories: sortedShares.map(item => item.cob),
          labels: { style: { colors: textColor } }
        },
        yaxis: [
          {
            title: { text: 'Pangsa (%)', style: { color: textColor } },
            labels: {
              formatter: (val) => val.toFixed(1) + '%',
              style: { colors: textColor }
            }
          },
          {
            opposite: true,
            title: { text: 'Rate on Line (%)', style: { color: textColor } },
            labels: {
              formatter: (val) => val.toFixed(3) + '%',
              style: { colors: textColor }
            }
          }
        ],
        colors: ['#435ebe', '#e5002b', '#f59e0b'],
        grid: { borderColor: borderColor },
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: function (val, { seriesIndex }) {
              if (seriesIndex === 2) return val.toFixed(4) + "%";
              return val.toFixed(2) + "%";
            }
          }
        },
        theme: { mode: chartMode }
      };

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [cobShares, theme]);

  return <div ref={chartRef}></div>;
};

// --- Component: Underwriting Performance Chart ---
const UnderwritingPerformanceChart = ({ yearlyOverall, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && yearlyOverall) {
      const isDark = theme === "dark";
      const textColor = isDark ? "#9ca3af" : "#4f5d73";
      const borderColor = isDark ? "#374151" : "#eceff5";
      const chartMode = isDark ? "dark" : "light";

      const options = {
        series: [
          {
            name: 'Gross Loss Ratio (%)',
            type: 'line',
            data: yearlyOverall.map(item => item.grossLossRatio)
          },
          {
            name: 'Net Loss Ratio (%)',
            type: 'line',
            data: yearlyOverall.map(item => item.netLossRatio)
          },
          {
            name: 'Claim Severity (Juta IDR / Klaim)',
            type: 'column',
            data: yearlyOverall.map(item => item.severityMillions)
          }
        ],
        chart: {
          height: 320,
          type: 'line',
          toolbar: { show: false },
          background: 'transparent',
          foreColor: textColor,
          fontFamily: "'Inter', sans-serif"
        },
        stroke: {
          width: [3, 3, 0],
          curve: 'smooth',
          dashArray: [0, 5, 0]
        },
        plotOptions: {
          bar: {
            columnWidth: '40%',
            borderRadius: 4
          }
        },
        xaxis: {
          categories: yearlyOverall.map(item => item.year.toString()),
          labels: { style: { colors: textColor } }
        },
        yaxis: [
          {
            title: { text: 'Loss Ratio (%)', style: { color: textColor } },
            labels: {
              formatter: (val) => val.toFixed(1) + '%',
              style: { colors: textColor }
            }
          },
          {
            opposite: true,
            title: { text: 'Severity (Juta IDR)', style: { color: textColor } },
            labels: {
              formatter: (val) => 'IDR ' + val.toFixed(1) + ' Juta',
              style: { colors: textColor }
            }
          }
        ],
        colors: ['#ef4444', '#f59e0b', '#435ebe'],
        grid: { borderColor: borderColor },
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: function (val, { seriesIndex }) {
              if (seriesIndex === 2) return 'IDR ' + val.toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' Juta';
              return val.toFixed(2) + "%";
            }
          }
        },
        theme: { mode: chartMode }
      };

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [yearlyOverall, theme]);

  return <div ref={chartRef}></div>;
};

// --- Component: COB Loss Ratio Trend Chart ---
const CobLossRatioTrendChart = ({ yearlyCob, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && yearlyCob) {
      const isDark = theme === "dark";
      const textColor = isDark ? "#9ca3af" : "#4f5d73";
      const borderColor = isDark ? "#374151" : "#eceff5";
      const chartMode = isDark ? "dark" : "light";

      const years = ['2021', '2022', '2023'];

      const series = Object.keys(yearlyCob).map(cob => ({
        name: cob,
        type: 'line',
        data: yearlyCob[cob].map(item => item.grossLossRatio)
      }));

      const options = {
        series: series,
        chart: {
          height: 320,
          type: 'line',
          toolbar: { show: false },
          background: 'transparent',
          foreColor: textColor,
          fontFamily: "'Inter', sans-serif"
        },
        stroke: {
          width: 3,
          curve: 'smooth'
        },
        xaxis: {
          categories: years,
          labels: { style: { colors: textColor } }
        },
        yaxis: {
          title: { text: 'Gross Loss Ratio (%)', style: { color: textColor } },
          labels: {
            formatter: (val) => val.toFixed(1) + '%',
            style: { colors: textColor }
          }
        },
        colors: [
          '#435ebe', '#3b82f6', '#06b6d4', '#10b981', 
          '#84cc16', '#eab308', '#f97316', '#ef4444', 
          '#ec4899', '#8b5cf6'
        ],
        grid: { borderColor: borderColor },
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: (val) => val.toFixed(2) + "%"
          }
        },
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          labels: { colors: textColor },
          itemMargin: { horizontal: 8, vertical: 6 }
        },
        theme: { mode: chartMode }
      };

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [yearlyCob, theme]);

  return <div ref={chartRef}></div>;
};

// --- Component: Reinsurance Efficacy Scatter Plot (Cession Rate vs Recovery Rate) ---
const ReinsuranceEfficacyChart = ({ cobShares, theme }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && cobShares) {
      const isDark = theme === "dark";
      const textColor = isDark ? "#9ca3af" : "#4f5d73";
      const borderColor = isDark ? "#374151" : "#eceff5";
      const chartMode = isDark ? "dark" : "light";
      const bgColor = isDark ? "#1f2937" : "#ffffff";

      // Calculate Recovery Rate per COB:
      // Recovery Rate = (1 - Net Claims / Gross Claims) * 100
      // = (1 - (Net LR * NWP) / (Gross LR * GWP)) * 100
      // = (1 - (netLossRatio * (1 - cessionRate/100)) / grossLossRatio) * 100
      const cobData = cobShares.map(item => {
        let recoveryRate = 0;
        if (item.grossLossRatio > 0) {
          recoveryRate = (1 - (item.netLossRatio * (1 - item.cessionRate / 100)) / item.grossLossRatio) * 100;
          recoveryRate = Math.max(0, Math.min(100, recoveryRate));
        }
        return {
          cob: item.cob,
          cessionRate: parseFloat(item.cessionRate.toFixed(2)),
          recoveryRate: parseFloat(recoveryRate.toFixed(2)),
          netLossRatio: item.netLossRatio,
          grossLossRatio: item.grossLossRatio
        };
      });

      // Split into Effective (recovery >= 30%) and Low Dependency (recovery < 30%)
      const RECOVERY_THRESHOLD = 30;
      const effectiveData = cobData
        .filter(d => d.recoveryRate >= RECOVERY_THRESHOLD)
        .map(d => ({ x: d.cessionRate, y: d.recoveryRate, cob: d.cob, netLR: d.netLossRatio, grossLR: d.grossLossRatio }));
      const lowDepData = cobData
        .filter(d => d.recoveryRate < RECOVERY_THRESHOLD)
        .map(d => ({ x: d.cessionRate, y: d.recoveryRate, cob: d.cob, netLR: d.netLossRatio, grossLR: d.grossLossRatio }));

      const options = {
        series: [
          { name: 'Effective', data: effectiveData },
          { name: 'Low Dependency', data: lowDepData }
        ],
        chart: {
          type: 'scatter',
          height: 420,
          toolbar: { show: false },
          background: 'transparent',
          foreColor: textColor,
          fontFamily: "'Inter', sans-serif",
          zoom: { enabled: false }
        },
        markers: {
          size: [14, 14],
          strokeWidth: 2,
          strokeColors: isDark ? '#374151' : '#ffffff',
          hover: { size: 16, sizeOffset: 2 }
        },
        colors: ['#4ade80', '#0e9db3'],
        xaxis: {
          tickAmount: 9,
          min: -5,
          max: 90,
          title: {
            text: 'Cession Rate (%)',
            style: { color: textColor, fontWeight: 600, fontSize: '12px' }
          },
          labels: {
            formatter: (val) => parseFloat(val) < 0 ? '' : parseFloat(val).toFixed(0) + '%',
            style: { colors: textColor }
          }
        },
        yaxis: {
          tickAmount: 6,
          min: -5,
          max: 65,
          title: {
            text: 'Recovery Rate (%)',
            style: { color: textColor, fontWeight: 600, fontSize: '12px' }
          },
          labels: {
            formatter: (val) => parseFloat(val) < 0 ? '' : parseFloat(val).toFixed(0) + '%',
            style: { colors: textColor }
          }
        },
        grid: {
          borderColor: borderColor,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: false } }
        },
        annotations: {
          yaxis: [{
            y: 30,
            borderColor: isDark ? '#6b7280' : '#9ca3af',
            borderWidth: 1.5,
            strokeDashArray: 5,
            label: {
              text: 'Recovery threshold 30%',
              position: 'left',
              offsetX: 8,
              style: {
                color: isDark ? '#9ca3af' : '#6b7280',
                fontSize: '10px',
                background: 'transparent',
                border: 0
              }
            }
          }],
          xaxis: [{
            x: 30,
            borderColor: isDark ? '#6b7280' : '#9ca3af',
            borderWidth: 1.5,
            strokeDashArray: 3,
            label: {
              text: 'Cession threshold 30%',
              orientation: 'vertical',
              style: {
                color: isDark ? '#9ca3af' : '#6b7280',
                fontSize: '10px',
                background: 'transparent',
                border: 0
              }
            }
          }]
        },
        dataLabels: {
          enabled: true,
          formatter: function(val, opts) {
            const idx = opts.dataPointIndex;
            const seriesIdx = opts.seriesIndex;
            const data = opts.w.config.series[seriesIdx].data;
            if (data && data[idx]) return data[idx].cob;
            return '';
          },
          offsetY: -16,
          style: {
            fontSize: '11px',
            fontWeight: 700,
            colors: [isDark ? '#86efac' : '#166534', isDark ? '#67e8f9' : '#155e75']
          },
          background: { enabled: false }
        },
        tooltip: {
          custom: function({ seriesIndex, dataPointIndex, w }) {
            const d = w.config.series[seriesIndex].data[dataPointIndex];
            const isLowDep = d.netLR > 60 || seriesIndex === 1;
            const borderClr = isLowDep ? '#ef4444' : '#22c55e';
            const labelClr = isLowDep ? '#ef4444' : '#16a34a';
            return `<div style="padding:10px 14px;border:2px solid ${borderClr};border-radius:8px;background:${bgColor};box-shadow:0 4px 12px rgba(0,0,0,0.15);">
              <div style="font-size:13px;font-weight:700;color:${labelClr};margin-bottom:4px;">${d.cob}</div>
              <div style="font-size:12px;color:${textColor};line-height:1.7;">
                Cession: <strong>${d.x.toFixed(2)}%</strong><br/>
                Recovery: <strong>${d.y.toFixed(2)}%</strong><br/>
                Net LR: <strong style="color:${d.netLR > 60 ? '#ef4444' : '#10b981'};">${d.netLR.toFixed(2)}%</strong>
              </div>
            </div>`;
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '12px',
          fontWeight: 600,
          labels: { colors: textColor },
          markers: { size: 10 },
          itemMargin: { horizontal: 12 }
        },
        theme: { mode: chartMode }
      };

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [cobShares, theme]);

  return <div ref={chartRef}></div>;
};

// --- Component: Concentration Section ---
const ConcentrationSection = ({ data, theme }) => {
  return (
    <div>
      <div className="executive-alert" style={{ backgroundColor: 'var(--primary-light)', borderLeftColor: 'var(--primary)', marginBottom: '1.5rem' }}>
        <div className="executive-alert-icon" style={{ color: 'var(--primary)' }}><i className="fas fa-circle-info"></i></div>
        <div className="executive-alert-content">
          <h4>Analisis Tren &amp; Konsentrasi Risiko Portofolio</h4>
          <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: '1.4' }}>
            Halaman ini memvisualisasikan data aktuaris berdasarkan <strong>Pangsa Eksposur</strong>, <strong>Rasio Premi vs Risiko</strong>, dan <strong>Tren Underwriting</strong> sepanjang periode 2021-2023. Pemahaman konsentrasi ini membantu optimasi treaty reasuransi serta evaluasi pembagian laba per Class of Business (COB).
          </p>
        </div>
      </div>

      <div className="dashboard-row-2">
        <div className="card">
          <div className="card-header">
            <h3>
              <i className="fas fa-chart-pie"></i> Pangsa Eksposur per COB
              <InfoTooltip
                title="Pangsa Eksposur per COB"
                info="Persentase kontribusi nilai eksposur (Sum Insured) masing-masing COB terhadap total portofolio."
                formula="Sum Insured COB / Total Sum Insured Portfolio"
                left={true}
              />
            </h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.88rem', marginBottom: '1rem', lineHeight: '1.4' }}>
              Distribusi total eksposur (Sum Insured) 10 Class of Business (COB). Segmen dengan pangsa dominan mewakili konsentrasi risiko terbesar bagi portofolio AXA.
            </p>
            <ExposureShareDonutChart cobShares={data.cobShares} theme={theme} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>
              <i className="fas fa-chart-line"></i> Pangsa Risiko vs Premi &amp; Rate on Line
              <InfoTooltip
                title="Pangsa Risiko vs Premi & ROL"
                info="Penyandingan pangsa premi (GWP Share) dan pangsa risiko (Exposure Share) beserta Rate on Line (premi per eksposur) per COB."
                formula="Rate on Line (ROL) = GWP / Sum Insured * 100%"
                left={false}
              />
            </h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.88rem', marginBottom: '1rem', lineHeight: '1.4' }}>
              Membandingkan volume premi (GWP Share) dan risiko (Exposure Share) dengan Rate on Line (ROL) per COB. Kesenjangan lebar menunjukkan adanya ketidakseimbangan penetapan harga premi (<em>pricing disparity</em>).
            </p>
            <PremiumRiskRolChart cobShares={data.cobShares} theme={theme} />
          </div>
        </div>
      </div>

      <div className="dashboard-row-equal" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>
              <i className="fas fa-chart-column"></i> Tren Performa Underwriting Portofolio
              <InfoTooltip
                title="Tren Underwriting Portofolio"
                info="Tren pergerakan rasio klaim kotor (Gross LR), rasio klaim bersih (Net LR), dan keparahan klaim portofolio secara historis tahun 2021-2023."
                formula="Rasio Klaim Tahunan (Gross LR & Net LR)"
                left={true}
              />
            </h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.88rem', marginBottom: '1rem', lineHeight: '1.4' }}>
              Tren performa underwriting historis (2021-2023) yang membandingkan Gross Loss Ratio, Net Loss Ratio, dan Rata-rata Severity (Nilai Klaim per Kejadian).
            </p>
            <UnderwritingPerformanceChart yearlyOverall={data.yearlyOverall} theme={theme} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>
              <i className="fas fa-shield-halved"></i> Efikasi Reasuransi per COB
              <InfoTooltip
                title="Efikasi Reasuransi per COB"
                info="Rasio premi reasuransi (Cession Rate %) disandingkan dengan rasio klaim kotor dan bersih untuk membandingkan efektivitas treaty."
                formula="Cession Rate vs Gross LR vs Net LR per COB"
                left={false}
              />
            </h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.88rem', marginBottom: '1rem', lineHeight: '1.4' }}>
              Perbandingan Cession Rate (%) terhadap Gross Loss Ratio (%) dan Net Loss Ratio (%) untuk menilai tingkat keefektifan transfer risiko di setiap lini bisnis.
            </p>
            <ReinsuranceEfficacyChart cobShares={data.cobShares} theme={theme} />
          </div>
        </div>
      </div>

      <div className="card full-width-row" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3>
            <i className="fas fa-chart-area"></i> Tren Underwriting Loss Ratio per COB
            <InfoTooltip
              title="Tren Loss Ratio per COB"
              info="Tren historis pergerakan Gross Loss Ratio dari tahun 2021 hingga 2023 untuk kesepuluh Class of Business (COB)."
              formula="Gross Loss Ratio Tahunan per COB"
              left={true}
            />
          </h3>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.88rem', marginBottom: '1.2rem', lineHeight: '1.4' }}>
            Grafik ini menggambarkan tren pergerakan Gross Loss Ratio historis secara lengkap untuk seluruh lini bisnis (COB 1 s.d. COB 10) dari tahun 2021 hingga 2023. Klik pada legenda di bawah untuk menyembunyikan/menampilkan segmen tertentu secara interaktif.
          </p>
          <CobLossRatioTrendChart yearlyCob={data.yearlyCob} theme={theme} />
        </div>
      </div>
    </div>
  );
};

// --- Component: Strategy Section ---
const StrategySection = () => {
  const [filter, setFilter] = useState("all");

  return (
    <div>
      <div className="strategy-tab-buttons">
        <button className={`strat-tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua Rekomendasi</button>
        <button className={`strat-tab-btn ${filter === 'recom-urgent' ? 'active' : ''}`} onClick={() => setFilter('recom-urgent')}>Underwriting & Pricing</button>
        <button className={`strat-tab-btn ${filter === 'recom-opt' ? 'active' : ''}`} onClick={() => setFilter('recom-opt')}>Reinsurance Strategy</button>
        <button className={`strat-tab-btn ${filter === 'recom-growth' ? 'active' : ''}`} onClick={() => setFilter('recom-growth')}>Portfolio Management</button>
      </div>

      <div className="recom-container">
        {(filter === 'all' || filter === 'recom-urgent') && (
          <div className="recom-item recom-urgent">
            <div className="recom-header">
              <span className="recom-area">Underwriting & Pricing</span>
              <span className="recom-badge badge-urgent">Tindakan Cepat Dibutuhkan</span>
            </div>
            <h4>Pembekuan Sementara & Koreksi Tarif di Branch K × Channel B</h4>
            <p>
              Penelitian drill-down menemukan <strong>akar masalah utama</strong> kegagalan portofolio asuransi terletak pada kombinasi spesifik: <strong>COB 6 di Branch K melalui Channel B untuk PRODUCT1217</strong> (Loss Ratio 21,083% dengan klaim IDR 366.4 Miliar) dan <strong>COB 7 di Branch K melalui Channel B untuk PRODUCT0221</strong> (Loss Ratio 1,765% dengan klaim IDR 177.9 Miliar).
            </p>
            <p style={{ marginTop: '0.6rem', fontWeight: 600 }}>Langkah Konkret:</p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.4rem', fontSize: '0.88rem', lineHeight: '1.5', listStyleType: 'square' }}>
              <li>Hentikan sementara penjualan produk asuransi PRODUCT1217 dan PRODUCT0221 di Branch K via Channel B.</li>
              <li>Lakukan audit underwriting menyeluruh terhadap agen atau distributor di Branch K untuk mencari motif anomali tingginya frekuensi dan keparahan klaim.</li>
              <li>Naikkan tarif premi dasar secara masif (*premium rate loading*) minimal sebesar 250% untuk menyeimbangkan rasio kerugian apabila produk kembali diluncurkan.</li>
              <li>Terapkan peningkatan batas risiko sendiri (*deductible/own retention*) per klaim untuk mencegah klaim-klaim kecil yang membebani tim operasional.</li>
            </ul>
          </div>
        )}

        {(filter === 'all' || filter === 'recom-opt') && (
          <div className="recom-item recom-opt">
            <div className="recom-header">
              <span className="recom-area">Treaty Reinsurance</span>
              <span className="recom-badge badge-opt">Optimasi Profitabilitas</span>
            </div>
            <h4>Restrukturisasi Treaty Reasuransi (Quota Share ke Excess of Loss)</h4>
            <p>
              Rasio transfer risiko ke reasuradur terbukti sangat merugikan perusahaan. AXA menyerahkan premi reasuransi ceded sebesar <strong>21.77% dari GWP (IDR 546.6 Miliar)</strong>, namun pemulihan klaim yang diperoleh dari reasuradur hanya <strong>7.19% (IDR 89.1 Miliar)</strong> dari total klaim. Hal ini memicu naiknya Net Loss Ratio bersih menjadi 58.54% (dibandingkan kotor yang sebesar 49.34%).
            </p>
            <p style={{ marginTop: '0.6rem', fontWeight: 600 }}>Langkah Konkret:</p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.4rem', fontSize: '0.88rem', lineHeight: '1.5', listStyleType: 'square' }}>
              <li>Naikkan batas retensi sendiri (*self-retention limit*) untuk lini bisnis berisiko rendah dan sangat menguntungkan, terutama COB 9 yang memiliki loss ratio 17.14%.</li>
              <li>Beralih dari skema treaty proporsional (*quota share*) yang membagi keuntungan underwriting asuransi sehat ke reasuradur, menjadi treaty non-proporsional (*Excess of Loss*).</li>
              <li>Struktur Excess of Loss akan melindungi perusahaan dari klaim-klaim bernominal ekstrim (severity tinggi) pada COB 6 dan COB 7 tanpa harus melepaskan sebagian besar premi COB 9 yang menguntungkan.</li>
            </ul>
          </div>
        )}

        {(filter === 'all' || filter === 'recom-growth') && (
          <div className="recom-item recom-growth">
            <div className="recom-header">
              <span className="recom-area">Marketing & Sales</span>
              <span className="recom-badge badge-growth">Strategi Ekspansi</span>
            </div>
            <h4>Alokasi Promosi & Penjualan pada COB 9 (Strategic Segment)</h4>
            <p>
              Class of Business **COB 9** merupakan penopang utama pendapatan portofolio perusahaan dengan GWP mencapai IDR 762.4 Miliar (porsi terbesar) dan memiliki rasio klaim kotor yang sangat sehat, yaitu hanya **17.14%**. Segmen ini menstabilkan kinerja keuangan portofolio AXA secara keseluruhan.
            </p>
            <p style={{ marginTop: '0.6rem', fontWeight: 600 }}>Langkah Konkret:</p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.4rem', fontSize: '0.88rem', lineHeight: '1.5', listStyleType: 'square' }}>
              <li>Berikan insentif komisi tambahan (*acquisition bonus*) bagi agen atau broker yang berhasil menjual produk COB 9.</li>
              <li>Gencarkan promosi pemasaran digital di daerah dengan profil risiko stabil untuk memperbesar market share COB 9.</li>
              <li>Pertahankan lini bisnis COB 8, COB 5, dan COB 3 yang tergolong dalam *Stable Segment* karena memberikan kontribusi margin underwriting yang konsisten meskipun volume bisnisnya kecil.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const StrategySectionV2 = () => {
  const [filter, setFilter] = useState("all");

  return (
    <div>
      <div className="strategy-tab-buttons">
        <button className={`strat-tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua Rekomendasi</button>
        <button className={`strat-tab-btn ${filter === 'recom-urgent' ? 'active' : ''}`} onClick={() => setFilter('recom-urgent')}>Underwriting & Pricing</button>
        <button className={`strat-tab-btn ${filter === 'recom-opt' ? 'active' : ''}`} onClick={() => setFilter('recom-opt')}>Reinsurance Strategy</button>
        <button className={`strat-tab-btn ${filter === 'recom-growth' ? 'active' : ''}`} onClick={() => setFilter('recom-growth')}>Portfolio Management</button>
      </div>

      <div className="recom-container">
        {(filter === 'all' || filter === 'recom-urgent') && (
          <div className="recom-item recom-urgent">
            <div className="recom-header">
              <span className="recom-area">Underwriting &amp; Pricing</span>
              <span className="recom-badge badge-urgent">Pengendalian Segmen Berisiko Tinggi</span>
            </div>
            <h4>Fokus Perbaikan pada Branch K × Channel B</h4>
            <p>
              Hasil analisis drill-down menunjukkan bahwa tekanan terbesar terhadap profitabilitas portofolio berasal dari kombinasi <strong>COB 6 – Product1217</strong> dan <strong>COB 7 – Product0221</strong> pada <strong>Branch K</strong> melalui <strong>Channel B</strong>.
            </p>
            <p>
              Segmen <strong>COB 6 – Product1217</strong> menghasilkan premi sebesar <strong>IDR 1,74 miliar</strong>, namun mencatat klaim sebesar <strong>IDR 366,46 miliar</strong> dengan <strong>Loss Ratio 21.083%</strong>. Sementara itu, <strong>COB 7 – Product0221</strong> mencatat <strong>Loss Ratio 1.765%</strong> dengan total klaim mencapai <strong>IDR 177,95 miliar</strong>. Temuan ini menunjukkan adanya konsentrasi risiko yang sangat tinggi pada kombinasi cabang, channel, dan produk tertentu.
            </p>
            <p style={{ marginTop: '0.6rem', fontWeight: 600 }}>Langkah Konkret:</p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.4rem', fontSize: '0.88rem', lineHeight: '1.5', listStyleType: 'square' }}>
              <li>Perketat proses underwriting untuk bisnis baru yang berasal dari Branch K dan Channel B.</li>
              <li>Lakukan review terhadap kecukupan tarif premi pada Product1217 dan Product0221 berdasarkan pengalaman klaim aktual.</li>
              <li>Terapkan pemantauan khusus terhadap segmen dengan loss ratio tinggi melalui indikator loss ratio, claim frequency, dan claim severity.</li>
              <li>Pisahkan analisis large claim dan non-large claim untuk memastikan keputusan underwriting tidak terdistorsi oleh klaim dengan nilai yang sangat besar.</li>
            </ul>
          </div>
        )}

        {(filter === 'all' || filter === 'recom-opt') && (
          <div className="recom-item recom-opt">
            <div className="recom-header">
              <span className="recom-area">Reinsurance Strategy</span>
              <span className="recom-badge badge-opt">Optimalisasi Efektivitas Transfer Risiko</span>
            </div>
            <h4>Memastikan Reasuransi Memberikan Nilai Tambah terhadap Portofolio</h4>
            <p>
              Analisis menunjukkan bahwa AXA mengalihkan sekitar <strong>21,77% premi (IDR 546,6 miliar)</strong> ke reasuransi, namun hanya memperoleh <strong>7,19% pemulihan klaim (IDR 89,1 miliar)</strong> dari total klaim yang terjadi.
            </p>
            <p>
              Akibatnya, <strong>Net Loss Ratio meningkat menjadi 58,54%</strong>, lebih tinggi dibandingkan <strong>Gross Loss Ratio sebesar 49,34%</strong>. Hal ini mengindikasikan bahwa manfaat proteksi yang diperoleh belum sepenuhnya sebanding dengan biaya reasuransi yang dikeluarkan.
            </p>
            <p style={{ marginTop: '0.6rem', fontWeight: 600 }}>Langkah Konkret:</p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.4rem', fontSize: '0.88rem', lineHeight: '1.5', listStyleType: 'square' }}>
              <li>Evaluasi kembali efektivitas program reasuransi pada setiap lini bisnis berdasarkan kontribusinya terhadap profitabilitas portofolio.</li>
              <li>Tingkatkan fokus reasuransi pada segmen dengan claim severity tinggi dan volatilitas klaim yang besar.</li>
              <li>Pertimbangkan peningkatan retensi pada lini bisnis dengan loss ratio rendah dan performa yang stabil, seperti COB 9.</li>
              <li>Gunakan hasil analisis loss ratio dan claim severity sebagai dasar dalam evaluasi maupun negosiasi program reasuransi berikutnya.</li>
            </ul>
          </div>
        )}

        {(filter === 'all' || filter === 'recom-growth') && (
          <div className="recom-item recom-growth">
            <div className="recom-header">
              <span className="recom-area">Portfolio Management</span>
              <span className="recom-badge badge-growth">Penguatan Segmen dengan Kinerja Terbaik</span>
            </div>
            <h4>Mendorong Pertumbuhan pada Portofolio yang Profitabel</h4>
            <p>
              Hasil Risk Profile Mapping menunjukkan bahwa <strong>COB 9</strong> merupakan segmen dengan kontribusi premi terbesar, yaitu <strong>IDR 762,4 miliar</strong>, serta memiliki <strong>Loss Ratio sebesar 17,14%</strong>, jauh di bawah rata-rata portofolio.
            </p>
            <p>
              Selain <strong>COB 9</strong>, segmen <strong>COB 1, COB 8, dan COB 10</strong> juga menunjukkan profil risiko yang relatif sehat dan konsisten sehingga berperan penting dalam menjaga stabilitas profitabilitas portofolio.
            </p>
            <p style={{ marginTop: '0.6rem', fontWeight: 600 }}>Langkah Konkret:</p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.4rem', fontSize: '0.88rem', lineHeight: '1.5', listStyleType: 'square' }}>
              <li>Jadikan COB 9 sebagai prioritas utama dalam pengembangan portofolio karena memiliki kombinasi volume premi tinggi dan tingkat klaim yang rendah.</li>
              <li>Arahkan kapasitas distribusi dan pengembangan bisnis pada segmen yang berada dalam kategori Strategic Segment.</li>
              <li>Pertahankan kontribusi COB 1, COB 8, dan COB 10 sebagai penyeimbang risiko portofolio.</li>
              <li>Alokasikan sumber daya bisnis secara lebih selektif pada lini bisnis yang menunjukkan kualitas underwriting dan profitabilitas yang baik.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Component: Glossary Section ---
const GlossarySection = ({ glossary }) => {
  const [search, setSearch] = useState("");

  const filteredGlossary = useMemo(() => {
    const query = search.toLowerCase().trim();
    return glossary.filter(item => 
      item.term.toLowerCase().includes(query) || 
      item.definition.toLowerCase().includes(query)
    );
  }, [search, glossary]);

  return (
    <div>
      <div className="glossary-search-wrapper">
        <div className="search-box-wrapper" style={{ width: '100%', maxWidth: '450px' }}>
          <i className="fas fa-search"></i>
          <input type="text" className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari istilah asuransi (GWP, NWP, Loss Ratio...)..." />
        </div>
      </div>

      <div id="glossary-container" class="glossary-grid">
        {filteredGlossary.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <i className="fas fa-search" style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--border-color)' }}></i>
            <p>Istilah tidak ditemukan. Silakan masukkan kata kunci lain.</p>
          </div>
        ) : (
          filteredGlossary.map((item, index) => (
            <div className="glossary-item" key={index}>
              <h4><i className="fas fa-book-bookmark"></i> {item.term}</h4>
              <p>{item.definition}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Component: Main Application ---
const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch actuarial data on mount
  useEffect(() => {
    fetch("/api/portfolio")
      .then(res => {
        if (!res.ok) throw new Error("Gagal mengambil data portofolio dari server.");
        return res.json();
      })
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Sync theme attribute to HTML tag
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "theme");
    // Handled by custom event listener inside app.js if any, but since we are React, 
    // we toggle the local state, which triggers chart render automatically because theme state is passed down.
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  const getTitleAndSubtitle = () => {
    switch(activeTab) {
      case "matrix":
        return { title: "Matriks Profil Risiko", subtitle: "Pemetaan Profil Risiko 10 Class of Business (COB) PT AXA Insurance" };
      case "concentration":
        return { title: "Tren & Konsentrasi Risiko", subtitle: "Visualisasi Pangsa Risiko, Tren Underwriting Loss Ratio, dan Efikasi Reasuransi" };
      case "drilldown":
        return { title: "Root Cause Analysis", subtitle: "Menganalisis akar penyebab kerugian berdasarkan cabang, channel, dan produk" };
      case "strategy":
        return { title: "Rekomendasi Strategis", subtitle: "Rencana Aksi Aktuaris dan Rekomendasi Underwriting, Pricing, & Reasuransi" };
      case "glossary":
        return { title: "Kamus Istilah Asuransi", subtitle: "Daftar Istilah Penting dan Definisi Analisis Risiko Asuransi Umum" };
      default:
        return { title: "Ringkasan Portofolio", subtitle: "Analisis Makro & Kinerja Keuangan Portofolio AXA Insurance Indonesia 2026" };
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-body)', color: 'var(--primary)' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}></i>
        <h3 style={{ fontFamily: 'var(--font-main)', fontWeight: 700 }}>Mengagregasi Data Excel & Memuat Dashboard...</h3>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-body)', padding: '2rem', textAlign: 'center' }}>
        <i className="fas fa-triangle-exclamation" style={{ fontSize: '4rem', color: 'var(--color-critical)', marginBottom: '1.5rem' }}></i>
        <h2 style={{ fontFamily: 'var(--font-main)', fontWeight: 800, color: 'var(--text-title)', marginBottom: '1rem' }}>Gagal Memuat Dashboard</h2>
        <p style={{ maxWidth: '500px', marginBottom: '1.5rem' }}>{error || "Koneksi ke backend Flask terputus."}</p>
        <button onClick={() => window.location.reload()} className="reset-filter-btn">Coba Lagi</button>
      </div>
    );
  }

  const { title, subtitle } = getTitleAndSubtitle();

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} toggleTheme={toggleTheme} />
      
      {/* Main content viewport */}
      <main className="main-content">
        <header className="main-header">
          <div className="header-title">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

        </header>

        {/* Content sections tabs switching */}
        <div className="content-viewport">
          {activeTab === "dashboard" && <OverviewSection data={data} theme={theme} />}
          {activeTab === "matrix" && <RiskMatrixSection cobList={data.cobPortfolio} theme={theme} />}
          {activeTab === "concentration" && <ConcentrationSection data={data} theme={theme} />}
          {activeTab === "drilldown" && <DrillDownSection rawData={data} />}
          {activeTab === "strategy" && <StrategySectionV2 />}
          {activeTab === "glossary" && <GlossarySection glossary={data.glossary} />}
        </div>
      </main>
    </div>
  );
};

// Mount App to Root element
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

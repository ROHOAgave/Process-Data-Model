import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ProductionEstimator = () => {
  // Helper functions for date manipulation without dependencies
  const formatDate = (date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    // UK date format: day/month/year
    return `${day}/${month}/${year}`;
  };
  
  // Format month as 3-letter abbreviation
  const formatMonthAbbrev = (monthNum) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNum - 1];
  };
  
  const addWeeks = (date, weeks) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + weeks * 7);
    return newDate;
  };
  
  const parseDate = (dateString) => {
    try {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // For UK format (DD/MM/YYYY), parts[0] is day, parts[1] is month
        // Month is 0-indexed in JavaScript Date
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
      return new Date();
    } catch (e) {
      console.error("Invalid date format", e);
      return new Date();
    }
  };

  // Initial data based on specifications
  const generateInitialData = (bottleRatio = 2) => {
    const rows = [];
    let currentBatch = 20;
    let currentDate = new Date('2025-03-07');
    let currentAgave = 65;
    
    for (let i = 0; i < 10; i++) {
      // Calculate values based on rules
      const fermentedLiquid = currentAgave * 35;
      const bottles = currentAgave * bottleRatio;
      
      rows.push({
        id: i,
        batch: currentBatch,
        date: currentDate,
        agave: currentAgave,
        fermentedLiquid: fermentedLiquid,
        bottleRatio: bottleRatio,
        bottles: bottles,
        // Default Kenya sales as 20% of total bottles
        kenyaSales: Math.round(bottles * 0.2)
      });
      
      // Increment for next row
      currentBatch += 1;
      currentDate = addWeeks(currentDate, 3);
      currentAgave = Math.min(currentAgave + 5, 100); // Cap at 100
    }
    
    return rows;
  };
  
  const [data, setData] = useState(generateInitialData());
  
  // Prepare data for the bottles distribution chart
  const prepareDistributionData = () => {
    let monthlyData = {};
    let cumulativeKenya = 0;
    let cumulativeUK = 0;
    
    // Sort data by date to ensure proper ordering
    const sortedData = [...data].sort((a, b) => a.date - b.date);
    
    // Group by month and year
    sortedData.forEach(row => {
      const date = row.date;
      const monthYear = `${formatMonthAbbrev(date.getMonth() + 1)} ${date.getFullYear()}`;
      
      // Calculate sales breakdown
      const kenyaSales = row.kenyaSales || 0;
      const ukSales = row.bottles - kenyaSales;
      
      // Add to cumulative totals
      cumulativeKenya += kenyaSales;
      cumulativeUK += ukSales;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          month: monthYear,
          bottles: row.bottles,
          kenya: kenyaSales,
          uk: ukSales,
          cumulativeKenya: cumulativeKenya,
          cumulativeUK: cumulativeUK,
          cumulativeTotal: cumulativeKenya + cumulativeUK,
          // Store the month number for sorting
          monthNum: date.getMonth() + 1,
          yearNum: date.getFullYear()
        };
      } else {
        monthlyData[monthYear].bottles += row.bottles;
        monthlyData[monthYear].kenya += kenyaSales;
        monthlyData[monthYear].uk += ukSales;
        monthlyData[monthYear].cumulativeKenya = cumulativeKenya;
        monthlyData[monthYear].cumulativeUK = cumulativeUK;
        monthlyData[monthYear].cumulativeTotal = cumulativeKenya + cumulativeUK;
      }
    });
    
    // Sort by year and month to ensure chronological order in chart
    return Object.values(monthlyData)
      .sort((a, b) => {
        if (a.yearNum !== b.yearNum) return a.yearNum - b.yearNum;
        return a.monthNum - b.monthNum;
      });
  };

  // Handle field changes
  const handleChange = (id, field, value) => {
    const updatedData = data.map(row => {
      if (row.id === id) {
        // Handle date separately since it's a special type
        if (field === 'date') {
          try {
            const dateValue = parseDate(value);
            return { ...row, [field]: dateValue };
          } catch (e) {
            console.error("Invalid date format", e);
            return row;
          }
        } else {
          // For numerical values, convert to number
          const numValue = field !== 'batch' ? parseFloat(value) : parseInt(value);
          const updatedRow = { ...row, [field]: isNaN(numValue) ? value : numValue };
          
          // Recalculate dependent values
          if (field === 'agave') {
            updatedRow.fermentedLiquid = numValue * 35;
            updatedRow.bottles = numValue * updatedRow.bottleRatio;
            // If bottles change, maintain Kenya sales proportion if possible
            if (row.bottles > 0) {
              const kenyaRatio = row.kenyaSales / row.bottles;
              updatedRow.kenyaSales = Math.min(
                Math.round(updatedRow.bottles * kenyaRatio),
                updatedRow.bottles
              );
            } else {
              updatedRow.kenyaSales = Math.round(updatedRow.bottles * 0.2);
            }
          } else if (field === 'bottleRatio') {
            updatedRow.bottles = row.agave * numValue;
            // If bottles change, maintain Kenya sales proportion if possible
            if (row.bottles > 0) {
              const kenyaRatio = row.kenyaSales / row.bottles;
              updatedRow.kenyaSales = Math.min(
                Math.round(updatedRow.bottles * kenyaRatio),
                updatedRow.bottles
              );
            } else {
              updatedRow.kenyaSales = Math.round(updatedRow.bottles * 0.2);
            }
          } else if (field === 'kenyaSales') {
            // Ensure Kenya sales don't exceed total bottles
            updatedRow.kenyaSales = Math.min(numValue, updatedRow.bottles);
          }
          
          return updatedRow;
        }
      }
      return row;
    });
    
    setData(updatedData);
  };
  
  // Apply bottle ratio change to all rows
  const handleGlobalBottleRatioChange = (newRatio) => {
    const numRatio = parseFloat(newRatio);
    if (isNaN(numRatio)) return;
    
    const updatedData = data.map(row => {
      const newBottles = row.agave * numRatio;
      // Maintain the same Kenya sales proportion when total bottles change
      let newKenyaSales;
      if (row.bottles > 0) {
        const kenyaRatio = row.kenyaSales / row.bottles;
        newKenyaSales = Math.min(Math.round(newBottles * kenyaRatio), newBottles);
      } else {
        newKenyaSales = Math.round(newBottles * 0.2);
      }
      
      return {
        ...row,
        bottleRatio: numRatio,
        bottles: newBottles,
        kenyaSales: newKenyaSales
      };
    });
    
    setData(updatedData);
  };
  
  // Handle Kenya sales change for a specific month/year
  const handleMonthlySalesChange = (monthYear, kenyaBottles) => {
    // Handle Kenya sales change for a specific month/year
    const month = parseInt(monthYear.split(' ')[0]);
    const year = parseInt(monthYear.split(' ')[1]);
    
    // Get total bottles for this month
    const monthTotalBottles = data.reduce((total, row) => {
      const rowMonth = row.date.getMonth() + 1;
      const rowYear = row.date.getFullYear();
      
      if (rowMonth === month && rowYear === year) {
        return total + row.bottles;
      }
      return total;
    }, 0);
    
    if (monthTotalBottles === 0) return;
    
    // Calculate what percentage of monthly bottles this represents
    const kenyaRatio = Math.min(parseInt(kenyaBottles) / monthTotalBottles, 1);
    if (isNaN(kenyaRatio)) return;
    
    // Update each row for this month
    const updatedData = data.map(row => {
      const rowMonth = row.date.getMonth() + 1;
      const rowYear = row.date.getFullYear();
      
      if (rowMonth === month && rowYear === year) {
        // Apply the same ratio to each row in this month
        return {
          ...row,
          kenyaSales: Math.round(row.bottles * kenyaRatio)
        };
      }
      return row;
    });
    
    setData(updatedData);
  };
  
  // Calculate maximum Kenya sales for a month (cannot exceed total bottles)
  const getMaxKenyaSales = (monthYear) => {
    // Parse the stored data format (e.g., "Jan 2025")
    const parts = monthYear.split(' ');
    const monthStr = parts[0];
    const year = parseInt(parts[1]);
    
    // Find the month number
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months.indexOf(monthStr) + 1;
    
    if (month === 0) {
      console.error("Invalid month abbreviation:", monthStr);
      return 0;
    }
    
    return data.reduce((total, row) => {
      const rowMonth = row.date.getMonth() + 1;
      const rowYear = row.date.getFullYear();
      
      if (rowMonth === month && rowYear === year) {
        return total + row.bottles;
      }
      return total;
    }, 0);
  };
  
  // Calculate current Kenya sales for a month
  const getCurrentKenyaSales = (monthYear) => {
    // Parse the stored data format (e.g., "Jan 2025")
    const parts = monthYear.split(' ');
    const monthStr = parts[0];
    const year = parseInt(parts[1]);
    
    // Find the month number
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months.indexOf(monthStr) + 1;
    
    if (month === 0) {
      console.error("Invalid month abbreviation:", monthStr);
      return 0;
    }
    
    return data.reduce((total, row) => {
      const rowMonth = row.date.getMonth() + 1;
      const rowYear = row.date.getFullYear();
      
      if (rowMonth === month && rowYear === year) {
        return total + (row.kenyaSales || 0);
      }
      return total;
    }, 0);
  };

  // Custom label renderer for chart to display totals above bars
  const renderCustomBarLabel = ({ x, y, width, value }) => {
    return (
      <text 
        x={x + width / 2} 
        y={y - 10} 
        fill="#000" 
        textAnchor="middle" 
        dominantBaseline="middle"
      >
        {`Total: ${value}`}
      </text>
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Production Estimator Model</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Global Agave-to-Bottles Ratio:
        </label>
        <div className="flex items-center">
          <input
            type="number"
            step="0.1"
            min="0.1"
            defaultValue="2"
            onChange={(e) => handleGlobalBottleRatioChange(e.target.value)}
            className="w-24 p-1 border rounded mr-2"
          />
          <span className="text-sm text-gray-500">
            (Changes ratio for all batches)
          </span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">Batch</th>
              <th className="py-2 px-4 border">Date</th>
              <th className="py-2 px-4 border">Agave pieces</th>
              <th className="py-2 px-4 border">Fermented liquid</th>
              <th className="py-2 px-4 border">Bottles Ratio</th>
              <th className="py-2 px-4 border">Bottles</th>
              <th className="py-2 px-4 border">Kenya Sales</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id}>
                <td className="py-2 px-4 border">
                  <input
                    type="number"
                    value={row.batch}
                    onChange={(e) => handleChange(row.id, 'batch', e.target.value)}
                    className="w-full p-1 border rounded"
                  />
                </td>
                <td className="py-2 px-4 border">
                  <input
                    type="text"
                    value={formatDate(row.date)}
                    onChange={(e) => handleChange(row.id, 'date', e.target.value)}
                    className="w-full p-1 border rounded"
                  />
                </td>
                <td className="py-2 px-4 border">
                  <input
                    type="number"
                    value={row.agave}
                    onChange={(e) => handleChange(row.id, 'agave', e.target.value)}
                    className="w-full p-1 border rounded"
                  />
                </td>
                <td className="py-2 px-4 border">
                  <input
                    type="number"
                    value={row.fermentedLiquid}
                    onChange={(e) => handleChange(row.id, 'fermentedLiquid', e.target.value)}
                    className="w-full p-1 border rounded"
                  />
                </td>
                <td className="py-2 px-4 border">
                  <input
                    type="number"
                    step="0.1"
                    value={row.bottleRatio}
                    onChange={(e) => handleChange(row.id, 'bottleRatio', e.target.value)}
                    className="w-full p-1 border rounded"
                  />
                </td>
                <td className="py-2 px-4 border">
                  <input
                    type="number"
                    value={row.bottles}
                    onChange={(e) => handleChange(row.id, 'bottles', e.target.value)}
                    className="w-full p-1 border rounded"
                  />
                </td>
                <td className="py-2 px-4 border">
                  <input
                    type="number"
                    value={row.kenyaSales}
                    onChange={(e) => handleChange(row.id, 'kenyaSales', e.target.value)}
                    className="w-full p-1 border rounded"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-bold mb-2">Production Summary</h3>
          <div className="bg-gray-50 p-4 rounded border">
            <p className="mb-1">Total Agave Pieces: {data.reduce((sum, row) => sum + row.agave, 0)}</p>
            <p className="mb-1">Total Fermented Liquid: {data.reduce((sum, row) => sum + row.fermentedLiquid, 0)}</p>
            <p className="mb-1">Total Bottles: {data.reduce((sum, row) => sum + row.bottles, 0)}</p>
            <p className="mb-1">Average Bottle Ratio: {(data.reduce((sum, row) => sum + row.bottleRatio, 0) / data.length).toFixed(2)}</p>
            <p className="mb-1">Total Kenya Sales: {data.reduce((sum, row) => sum + (row.kenyaSales || 0), 0)}</p>
            <p>Total UK Sales: {data.reduce((sum, row) => sum + (row.bottles - (row.kenyaSales || 0)), 0)}</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-bold mb-2">Kenya Market Distribution by Month</h3>
          
          <div className="mb-4">
            <h4 className="text-md font-medium mb-2">Kenya Sales Proportion by Month</h4>
            <div className="grid grid-cols-1 gap-2">
              {prepareDistributionData().map(monthData => {
                const currentKenyaSales = monthData.kenya;
                const totalBottles = monthData.bottles;
                const kenyaPercentage = totalBottles > 0 ? Math.round((currentKenyaSales / totalBottles) * 100) : 0;
                
                return (
                  <div key={monthData.month} className="mb-2">
                    <div className="flex items-center mb-1">
                      <label className="mr-2 text-sm w-16">{monthData.month}:</label>
                      <span className="text-sm">{currentKenyaSales} / {totalBottles} bottles ({kenyaPercentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-orange-500 h-4 rounded-full" 
                        style={{ width: `${kenyaPercentage}%` }}
                        title={`Kenya: ${kenyaPercentage}%`}
                      >
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white p-2 rounded border" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prepareDistributionData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  label={{ value: 'Month/Year', position: 'insideBottom', offset: -15 }}
                />
                <YAxis 
                  label={{ value: 'Cumulative Bottle Count', angle: -90, position: 'insideLeft', offset: 10 }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "cumulativeKenya") {
                      return [`${value} bottles`, "Kenya Market (Cumulative)"];
                    } else if (name === "cumulativeUK") {
                      return [`${value} bottles`, "UK Market (Cumulative)"];
                    }
                    return [`${value} bottles`, name];
                  }}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar 
                  dataKey="cumulativeKenya" 
                  stackId="a" 
                  fill="#FF9800" 
                  name="Kenya Sales (Cumulative)" 
                />
                <Bar 
                  dataKey="cumulativeUK" 
                  stackId="a" 
                  fill="#4CAF50" 
                  name="UK Sales (Cumulative)" 
                />
                <Bar 
                  dataKey="cumulativeTotal" 
                  fill="transparent" 
                  isAnimationActive={false}
                  label={renderCustomBarLabel}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionEstimator;

import React, { useState, useEffect } from "react";
import './index.css';
function App() {
  const [file, setFile] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [reports, setReports] = useState([]);
  const [result, setResult] = useState(null);

  const [activeTab, setActiveTab] = useState("expenses");
const [anomalies, setAnomalies] = useState([]);
 
const [anomalyInfo, setAnomalyInfo] = useState(null);


  useEffect(() => {
    loadExpenses();
    loadReports();
     loadAnomalies();
  }, []);

  const importCSV = async () => {
    if (!file) return alert("Select a CSV file");

    const formData = new FormData();
    formData.append("csvfile", file);

    const response = await fetch("http://localhost:3000/api/import", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      setResult(data);
  setAnomalies(data.anomalies || []);
  loadExpenses();
  loadReports();
    }
  };



  const loadAnomalies = async () => {
  try {
    const response = await fetch(
      "http://localhost:3000/api/anomalies"
    );

    const data = await response.json();

    setAnomalies(data.anomalies || []);
    setAnomalyInfo(data);
  } catch (error) {
    console.error(error);
  }
};

  const loadExpenses = async () => {
    const response = await fetch("http://localhost:3000/api/expenses");
    const data = await response.json();
    setExpenses(data);
  };

  const loadReports = async () => {
    const response = await fetch("http://localhost:3000/api/reports");
    const data = await response.json();
    setReports(data);
  };

   return (
  <div className="min-h-screen bg-slate-100">
    <div className="max-w-7xl mx-auto p-4 md:p-8">

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-800">
          💰 Expense Tracker
        </h1>
        <p className="text-slate-500 mt-2">
          Import CSV and detect anomalies automatically
        </p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Import CSV File
        </h2>

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="flex-1 border rounded-lg p-3"
          />

          <button
            onClick={importCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Import & Analyze
          </button>
        </div>

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-300">
            <p className="text-green-700 font-medium">
              ✅ Imported {result.stats.imported} rows
            </p>

            <p className="text-yellow-700">
              ⚠️ Found {result.stats.anomalies} anomalies
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      {result && (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-xl">
            <h3 className="text-3xl font-bold">
              {result.stats.total}
            </h3>
            <p>Total Rows</p>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl">
            <h3 className="text-3xl font-bold">
              {result.stats.imported}
            </h3>
            <p>Imported</p>
          </div>

          <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-6 rounded-xl">
            <h3 className="text-3xl font-bold">
              {result.stats.anomalies}
            </h3>
            <p>Anomalies</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-auto">
        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-5 py-2 rounded-lg ${
            activeTab === "expenses"
              ? "bg-blue-600 text-white"
              : "bg-white"
          }`}
        >
          Expenses
        </button>

        <button
          onClick={() => setActiveTab("anomalies")}
          className={`px-5 py-2 rounded-lg ${
            activeTab === "anomalies"
              ? "bg-blue-600 text-white"
              : "bg-white"
          }`}
        >
          Anomalies
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`px-5 py-2 rounded-lg ${
            activeTab === "reports"
              ? "bg-blue-600 text-white"
              : "bg-white"
          }`}
        >
          Reports
        </button>
      </div>

      {/* EXPENSES TAB */}
      {activeTab === "expenses" && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">
            Expenses
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Paid By</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className={`border-b ${
                      expense.is_anomaly
                        ? "bg-yellow-50"
                        : ""
                    }`}
                  >
                    <td className="p-3">{expense.expense_date}</td>
                    <td className="p-3">{expense.category}</td>
                    <td className="p-3 font-semibold text-green-600">
                      ₹{expense.amount}
                    </td>
                    <td className="p-3">{expense.paid_by}</td>

                    <td className="p-3">
                      {expense.is_anomaly ? (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                          Anomaly
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ANOMALIES TAB */}
      {activeTab === "anomalies" && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
           <div className="flex justify-between items-center mb-6">
  <div>
    <h2 className="text-2xl font-semibold">
      Detected Anomalies
    </h2>

    {anomalyInfo && (
      <p className="text-sm text-slate-500 mt-1">
        File: {anomalyInfo.fileName}
      </p>
    )}
  </div>

  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">
    {anomalyInfo?.count || 0} anomalies
  </span>
</div>

          {anomalies.length === 0 ? (
           <div className="text-center py-10">
  <div className="text-5xl mb-3">✅</div>
  <p className="text-slate-600">
    No anomalies detected in the latest import.
  </p>
</div>
          ) : (
            anomalies.map((a, index) => (
              <div
                key={index}
                className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded"
              >
                <h3 className="font-semibold text-red-700">
                  Row {a.rowNumber} - {a.type}
                </h3>

               <div className="mt-3 space-y-2">
  <p>
    <strong>Handling:</strong> {a.handling}
  </p>

  {a.details && (
    <p>
      <strong>Details:</strong> {a.details}
    </p>
  )}

  {a.originalData && (
    <div className="bg-white p-3 rounded border">
      <strong>Original Data</strong>

      <div>Date: {a.originalData.date}</div>
      <div>Amount: {a.originalData.amount}</div>
      <div>Paid By: {a.originalData.paid_by}</div>
    </div>
  )}
</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === "reports" && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">
            Import Reports
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">File</th>
                  <th className="p-3 text-left">Total</th>
                  <th className="p-3 text-left">Imported</th>
                  <th className="p-3 text-left">Anomalies</th>
                </tr>
              </thead>

              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b">
                    <td className="p-3">
                      {new Date(
                        report.import_date
                      ).toLocaleString()}
                    </td>

                    <td className="p-3">
                      {report.file_name}
                    </td>

                    <td className="p-3">
                      {report.total_rows}
                    </td>

                    <td className="p-3">
                      {report.rows_imported}
                    </td>

                    <td className="p-3">
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        {report.anomalies_found}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  </div>
);
}

export default App;
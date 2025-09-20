import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../../Employee/Styles/EmployeeAttendence.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";

export default function EmployeeAttendance() {
  const [activeTab, setActiveTab] = useState("weekly");
  const [attendance, setAttendance] = useState({});
  const [toast, setToast] = useState({ message: null, isError: false });

  const [dailyAttendance, setDailyAttendance] = useState([]);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1); // default current month
  const token = localStorage.getItem("token");

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getWeekDates = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 7 : today.getDay() - 1));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates();

  const handleFieldChange = (date, field, value) => {
    const key = formatDate(date);
    setAttendance((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const summary = {
    Present: weekDates.filter((d) => attendance[formatDate(d)]?.action === "Present").length,
    WFH: weekDates.filter((d) => attendance[formatDate(d)]?.action === "WFH").length,
    Leave: weekDates.filter((d) => attendance[formatDate(d)]?.action === "Leave").length,
  };

  const getStatusColor = (status) => {
    if (status === "Present") return "green";
    if (status === "WFH") return "blue";
    if (status === "Leave") return "red";
    return "black";
  };

  const formatFullDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getCurrentWeekRange = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    return `${formatFullDate(monday)} - ${formatFullDate(friday)}`;
  };

  //changed 
  const handleSubmit = async () => {
    try {
      const payload = {};
      Object.entries(attendance).forEach(([dateStr, entry]) => {
        if (!entry.action) return;
        const d = new Date(dateStr);
        payload[dateStr] = {
          date: dateStr,
          day: d.toLocaleDateString("en-US", { weekday: "long" }),
          action: entry.action,
          hours: entry.hours || 0,
          project_name: entry.project || "",
          sub_task: entry.subTask || "",
        };
      });


      const response = await fetch(`http://127.0.0.1:8000/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`  // pass token
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToast({ message: data.message || "Attendance submitted successfully!", isError: false });
      } else {
        let msg = "";
        if (Array.isArray(data.detail)) {
          msg = data.detail.map(err => `${err.loc.join(" → ")}: ${err.msg}`).join(", ");
        } else {
          msg = data.detail || "Invalid data";
        }
        setToast({ message: msg, isError: true });
      }
    } catch (err) {
      console.error("Attendance submit error:", err);
      setToast({ message: "Server error, please try again.", isError: true });
    }
  };

  //changed
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/get_attendance", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch attendance");

        const data = await response.json();

        const formatted = {};
        data.forEach((rec) => {
          const key = rec.date.split("T")[0];
          formatted[key] = {
            action: rec.action,
            hours: rec.hours,
            project: rec.project_name,
            subTask: rec.sub_task,
          };
        });

        setAttendance(formatted);
      } catch (err) {
        console.error("Error fetching attendance:", err);
      }
    };

    if (token) fetchAttendance();
  }, [token]);

  const fetchDailyAttendance = async () => {
    try {
      const url = `http://127.0.0.1:8000/attendance/daily?year=${yearFilter}${monthFilter ? `&month=${monthFilter}` : ""}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDailyAttendance(res.data || []);
    } catch (err) {
      console.error("Daily attendance fetch error:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "daily") {
      fetchDailyAttendance();
    }
  }, [activeTab, yearFilter, monthFilter]);

  useEffect(() => {
    if (toast.message) {
      const timer = setTimeout(() => setToast({ message: null, isError: false }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (toast.message) {
      const timer = setTimeout(() => setToast({ message: null, isError: false }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="attendance-container container py-4">
      {toast.message && (
        <div className={`toast-message ${toast.isError ? "error" : "success"}`}>
          <FontAwesomeIcon
            icon={toast.isError ? faTimesCircle : faCheckCircle}
            className="me-2"
          />
          {toast.message}
        </div>
      )}

      <h3 className="text-center mb-4">Manager Attendance</h3>

      <ul className="nav nav-tabs">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "weekly" ? "active" : ""}`}
            onClick={() => setActiveTab("weekly")}
          >
            Weekly View
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "calendar" ? "active" : ""}`}
            onClick={() => setActiveTab("calendar")}
          >
            Calendar View
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "daily" ? "active" : ""}`}
            onClick={() => setActiveTab("daily")}
          >
            Monthly View
          </button>
        </li>
      </ul>

      <div className="tab-content p-3 border border-top-0">
        {activeTab === "weekly" && (
          <>
            <div className="row text-center mb-4">
              <div className="col-md-4">
                <h6>Present</h6>
                <p className="text-success">{summary.Present}</p>
              </div>
              <div className="col-md-4">
                <h6>Work From Home</h6>
                <p className="text-primary">{summary.WFH}</p>
              </div>
              <div className="col-md-4">
                <h6>Leave</h6>
                <p className="text-danger">{summary.Leave}</p>
              </div>
            </div>

            <h5 className="week-heading text-center">
              Current Week: {getCurrentWeekRange()}
            </h5>

            <table className="table table-bordered text-center attendance-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>No. of Hours</th>
                  <th>Project Name</th>
                  <th>Sub Task</th> {/* ✅ New Column */}
                </tr>
              </thead>
              <tbody>
                {weekDates.map((date, idx) => {
                  const key = formatDate(date);
                  const entry = attendance[key] || {};
                  return (
                    <tr key={idx}>
                      <td>{date.toLocaleDateString("en-US", { weekday: "long" })}</td>
                      <td>
                        {date.getDate()}-
                        {date.toLocaleDateString("en-US", { month: "short" })}
                      </td>
                      <td>
                        <select
                          className="form-control"
                          value={entry.action || ""}
                          onChange={(e) =>
                            handleFieldChange(date, "action", e.target.value)
                          }
                        >
                          <option value="">-- Select --</option>
                          <option value="Present">Present</option>
                          <option value="WFH">WFH</option>
                          <option value="Leave">Leave</option>
                        </select>
                      </td>
                      <td style={{ color: getStatusColor(entry.action) }}>
                        {entry.action || "Not Marked"}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Hours"
                          value={entry.hours || ""}
                          onChange={(e) =>
                            handleFieldChange(date, "hours", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Project Name"
                          value={entry.project || ""}
                          onChange={(e) =>
                            handleFieldChange(date, "project", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Sub Task"
                          value={entry.subTask || ""}
                          onChange={(e) =>
                            handleFieldChange(date, "subTask", e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="text-center mt-3">
              <button className="btn btn-primary" onClick={handleSubmit}>
                Submit Attendance
              </button>
            </div>
          </>
        )}

        {activeTab === "calendar" && (
          <Calendar
            value={null}
            onChange={() => { }}
            onClickDay={() => { }}
            tileContent={({ date }) => {
              const key = formatDate(date);
              const entry = attendance[key];
              return entry?.action ? (
                <div
                  style={{
                    fontSize: "0.7rem",
                    marginTop: "3px",
                    color: getStatusColor(entry.action),
                  }}
                >
                  {entry.action} ({entry.hours || "-"}h)
                  {entry.subTask ? ` - ${entry.subTask}` : ""}
                </div>
              ) : null;
            }}
          />
        )}


        {/* Daily View */}
        {activeTab === "daily" && (
          <div>
            <div className="d-flex mb-3 align-items-center gap-2">
              <label>Year:</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="form-select w-auto"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>

              <label>Month:</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="form-select w-auto"
              >
                <option value="">All</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(0, m - 1).toLocaleString("default", { month: "long" })}
                  </option>
                ))}
              </select>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  setYearFilter(new Date().getFullYear());
                  setMonthFilter("");
                }}
              >
                Reset Filters
              </button>
            </div>

            <table className="table table-bordered text-center">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Hours</th>
                  <th>Project</th>
                  <th>Sub Task</th>
                </tr>
              </thead>
              <tbody>
                {dailyAttendance.length === 0 ? (
                  <tr>
                    <td colSpan="5">No records found</td>
                  </tr>
                ) : (
                  dailyAttendance.map((entry, idx) => (
                    <tr key={idx}>
                      <td>{new Date(entry.date).toLocaleDateString()}</td>
                      <td style={{ color: getStatusColor(entry.action) }}>{entry.action}</td>
                      <td>{entry.hours}</td>
                      <td>{entry.project}</td>
                      <td>{entry.subTask}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
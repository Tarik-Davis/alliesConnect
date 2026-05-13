import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Col, Form, Row, Spinner, Table } from "react-bootstrap";
import "../../App.css";
import { API_URL } from "./volunteerHelpers";

function ViewShiftsContent({ userId }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`${API_URL}/api/volunteers/${userId}/resource-shifts`)
      .then((res) => res.json())
      .then((data) => setShifts(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Error fetching resource shifts:", err);
        setShifts([]);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const filteredShifts = shifts.filter((row) => {
    const matchesName = (row.resource_name || "")
      .toLowerCase()
      .includes(nameFilter.toLowerCase());

    const rowDate = dayjs(row.shift_start);
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = rowDate.startOf("day") >= dayjs(dateFrom).startOf("day");
    }
    if (matchesDate && dateTo) {
      matchesDate = rowDate.startOf("day") <= dayjs(dateTo).startOf("day");
    }

    return matchesName && matchesDate;
  });

  const clearFilters = () => {
    setNameFilter("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <>
      {/* Filters */}
      <Row className="mb-3 align-items-end">
        <Col md={4}>
          <Form.Group>
            <Form.Label>
              <strong>Resource Name</strong>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Search by resource name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>
              <strong>From</strong>
            </Form.Label>
            <Form.Control
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>
              <strong>To</strong>
            </Form.Label>
            <Form.Control
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={2}>
          <button
            type="button"
            className="btn-gold w-100"
            onClick={clearFilters}
          >
            Clear
          </button>
        </Col>
      </Row>

      {/* Table */}
      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" size="sm" /> Loading shifts…
        </div>
      ) : filteredShifts.length === 0 ? (
        <p className="text-muted text-center">No resource shifts found.</p>
      ) : (
        <Table hover className="text-center align-middle">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Organization</th>
              <th>Date</th>
              <th>Start</th>
              <th>End</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredShifts.map((row) => {
              const isPast = row.shift_status === "past";
              const rowStyle = isPast
                ? { color: "#999", backgroundColor: "#f5f5f5" }
                : {};

              return (
                <tr key={row.shift_id} style={rowStyle}>
                  <td>{row.resource_name}</td>
                  <td>{row.provider_name}</td>
                  <td>{dayjs(row.shift_start).format("MMM D, YYYY")}</td>
                  <td>{dayjs(row.shift_start).format("h:mm A")}</td>
                  <td>{dayjs(row.shift_end).format("h:mm A")}</td>
                  <td>
                    {row.city && row.state ? `${row.city}, ${row.state}` : "—"}
                  </td>
                  <td>
                    {isPast ? (
                      <span className="text-muted">Past</span>
                    ) : (
                      <span className="text-success fw-bold">Upcoming</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}

export default ViewShiftsContent;

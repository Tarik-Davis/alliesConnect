import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Col, Form, Row, Spinner, Table } from "react-bootstrap";
import "../../App.css";
import EventDetailsModal from "../EventDetailsModal";
import { API_URL } from "./volunteerHelpers";

function ReviewSignupsContent({ userId }) {
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const fetchSignups = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`${API_URL}/api/volunteers/${userId}/event-signups`)
      .then((res) => res.json())
      .then((data) => setSignups(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Error fetching volunteer signups:", err);
        setSignups([]);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    fetchSignups();
  }, [fetchSignups]);

  const filteredSignups = signups.filter((row) => {
    const displayName = row.title || row.opportunity_title || "";
    const matchesName = displayName
      .toLowerCase()
      .includes(nameFilter.toLowerCase());

    const rowDate = dayjs(row.start_datetime);
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = rowDate.startOf("day") >= dayjs(dateFrom).startOf("day");
    }
    if (matchesDate && dateTo) {
      matchesDate = rowDate.startOf("day") <= dayjs(dateTo).startOf("day");
    }

    return matchesName && matchesDate;
  });

  const handleOpenEvent = (row) => {
    const address = [row.street_address_1, row.city, row.state, row.zip]
      .filter(Boolean)
      .join(", ");

    setSelectedEvent({
      id: row.event_id,
      title: row.title,
      startDatetime: row.start_datetime,
      endDatetime: row.end_datetime,
      type: row.category_name,
      address,
      location: `${row.city}, ${row.state}`,
      organization: row.provider_name,
      description: row.description,
      image_url: row.image_url,
    });
    setShowEventModal(true);
  };

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
              <strong>Event Name</strong>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Search by event name"
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
          <Spinner animation="border" size="sm" /> Loading signups…
        </div>
      ) : filteredSignups.length === 0 ? (
        <p className="text-muted text-center">No volunteer signups found.</p>
      ) : (
        <Table hover className="text-center align-middle">
          <thead>
            <tr>
              <th>Event</th>
              <th>Organization</th>
              <th>Date</th>
              <th>Location</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSignups.map((row) => {
              const isPast = row.event_status === "past";
              const displayName = row.title || row.opportunity_title || "—";
              const rowStyle = isPast
                ? { color: "#999", backgroundColor: "#f5f5f5" }
                : {};

              return (
                <tr
                  key={`${row.event_id}-${row.opportunity_id}`}
                  style={rowStyle}
                >
                  <td>{displayName}</td>
                  <td>{row.provider_name}</td>
                  <td>
                    {row.start_datetime
                      ? dayjs(row.start_datetime).format("MMM D, YYYY")
                      : "—"}
                  </td>
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
                  <td>
                    <button
                      className="btn-gold"
                      onClick={() => handleOpenEvent(row)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* Event Details Modal — same one used on /events page */}
      <EventDetailsModal
        show={showEventModal}
        onHide={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
          // Refresh signups in case shifts were changed
          fetchSignups();
        }}
        event={selectedEvent}
      />
    </>
  );
}

export default ReviewSignupsContent;

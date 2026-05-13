import { useEffect, useState } from "react";
import { Modal, Table } from "react-bootstrap";
import "../App.css";
import VolunteerDetailsModal from "./VolunteerDetailsModal";

const API_URL = process.env.REACT_APP_API_URL;

function useTableDataProcessing(data, searchField) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const sortSymbol = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? " ▲" : " ▼";
    }
    return " ";
  };

  const sortedData = [...data]
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      return 0;
    })
    .filter((item) =>
      String(item[searchField] ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );

  return { sortedData, handleSort, sortSymbol, searchQuery, setSearchQuery };
}

function SubscribedOrgsContent({ onViewDetails, userId }) {
  const [orgs, setOrgs] = useState([]);
  const { sortedData, handleSort, sortSymbol, searchQuery, setSearchQuery } =
    useTableDataProcessing(orgs, "name");

  useEffect(() => {
    fetchSubscribedOrgs();
  }, []);

  const fetchSubscribedOrgs = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/volunteers/${userId}/organizations`,
      );
      const data = await response.json();
      setOrgs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching subscribed organizations:", error);
      setOrgs([]);
    }
  };

  return (
    <>
      <input
        type="text"
        className="form-control mb-3"
        placeholder="Search by organization name"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Table hover className="text-center">
        <thead>
          <tr>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("name")}
            >
              Organization {sortSymbol("name")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("email")}
            >
              Email {sortSymbol("email")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("phone")}
            >
              Phone {sortSymbol("phone")}
            </th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-muted">
                No subscribed organizations found.
              </td>
            </tr>
          ) : (
            sortedData.map((org) => (
              <tr
                key={org.organization_id || org.id}
                className="text-center align-middle"
              >
                <td>{org.name}</td>
                <td>{org.email}</td>
                <td>{org.phone}</td>
                <td>
                  <button
                    className="outline-warning me-2"
                    onClick={() => onViewDetails("subscribedOrgs", org)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}

function EditAvailabilityContent({ onViewDetails, userId }) {
  const [availability, setAvailability] = useState([]);
  const { sortedData, handleSort, sortSymbol, searchQuery, setSearchQuery } =
    useTableDataProcessing(availability, "day");

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/volunteers/${userId}/availability`,
      );
      const data = await response.json();
      setAvailability(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching availability:", error);
      setAvailability([]);
    }
  };

  return (
    <>
      <input
        type="text"
        className="form-control mb-3"
        placeholder="Search by day"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Table hover className="text-center">
        <thead>
          <tr>
            <th style={{ cursor: "pointer" }} onClick={() => handleSort("day")}>
              Day {sortSymbol("day")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("start_time")}
            >
              Start Time {sortSymbol("start_time")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("end_time")}
            >
              End Time {sortSymbol("end_time")}
            </th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-muted">
                No availability set.
              </td>
            </tr>
          ) : (
            sortedData.map((slot, index) => (
              <tr key={slot.id || index} className="text-center align-middle">
                <td>{slot.day}</td>
                <td>{slot.start_time}</td>
                <td>{slot.end_time}</td>
                <td>
                  <button
                    className="outline-warning me-2"
                    onClick={() => onViewDetails("editAvailability", slot)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}

function ContactInfoContent({ onViewDetails, userId }) {
  const [contacts, setContacts] = useState([]);
  const { sortedData, handleSort, sortSymbol, searchQuery, setSearchQuery } =
    useTableDataProcessing(contacts, "name");

  useEffect(() => {
    fetchContactInfo();
  }, []);

  const fetchContactInfo = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/volunteers/${userId}/contacts`,
      );
      const data = await response.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching contact info:", error);
      setContacts([]);
    }
  };

  return (
    <>
      <input
        type="text"
        className="form-control mb-3"
        placeholder="Search by name"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Table hover className="text-center">
        <thead>
          <tr>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("name")}
            >
              Name {sortSymbol("name")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("email")}
            >
              Email {sortSymbol("email")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("phone")}
            >
              Phone {sortSymbol("phone")}
            </th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-muted">
                No contact information found.
              </td>
            </tr>
          ) : (
            sortedData.map((contact, index) => (
              <tr
                key={contact.id || index}
                className="text-center align-middle"
              >
                <td>{contact.name}</td>
                <td>{contact.email}</td>
                <td>{contact.phone}</td>
                <td>
                  <button
                    className="outline-warning me-2"
                    onClick={() => onViewDetails("contactInfo", contact)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}

function ReviewSignupsContent({ onViewDetails, userId }) {
  const [signups, setSignups] = useState([]);
  const { sortedData, handleSort, sortSymbol, searchQuery, setSearchQuery } =
    useTableDataProcessing(signups, "title");

  useEffect(() => {
    fetchSignups();
  }, []);

  const fetchSignups = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/volunteers/${userId}/signups`,
      );
      const data = await response.json();
      setSignups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching event signups:", error);
      setSignups([]);
    }
  };

  return (
    <>
      <input
        type="text"
        className="form-control mb-3"
        placeholder="Search by event name"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Table hover className="text-center">
        <thead>
          <tr>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("title")}
            >
              Event {sortSymbol("title")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("event_date")}
            >
              Date {sortSymbol("event_date")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("location")}
            >
              Location {sortSymbol("location")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("status")}
            >
              Status {sortSymbol("status")}
            </th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-muted">
                No event signups found.
              </td>
            </tr>
          ) : (
            sortedData.map((signup) => (
              <tr
                key={signup.signup_id || signup.id}
                className="text-center align-middle"
              >
                <td>{signup.title || signup.event_name}</td>
                <td>{signup.event_date}</td>
                <td>{signup.location}</td>
                <td>{signup.status}</td>
                <td>
                  <button
                    className="outline-warning me-2"
                    onClick={() => onViewDetails("reviewSignups", signup)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}

function ViewShiftsContent({ onViewDetails, userId }) {
  const [shifts, setShifts] = useState([]);
  const { sortedData, handleSort, sortSymbol, searchQuery, setSearchQuery } =
    useTableDataProcessing(shifts, "event_name");

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/volunteers/${userId}/shifts`,
      );
      const data = await response.json();
      setShifts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      setShifts([]);
    }
  };

  return (
    <>
      <input
        type="text"
        className="form-control mb-3"
        placeholder="Search by event name"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Table hover className="text-center">
        <thead>
          <tr>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("event_name")}
            >
              Event {sortSymbol("event_name")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("shift_date")}
            >
              Date {sortSymbol("shift_date")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("start_time")}
            >
              Start {sortSymbol("start_time")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("end_time")}
            >
              End {sortSymbol("end_time")}
            </th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-muted">
                No shifts found.
              </td>
            </tr>
          ) : (
            sortedData.map((shift, index) => (
              <tr
                key={shift.shift_id || index}
                className="text-center align-middle"
              >
                <td>{shift.event_name || shift.title}</td>
                <td>{shift.shift_date || shift.event_date}</td>
                <td>{shift.start_time}</td>
                <td>{shift.end_time}</td>
                <td>
                  <button
                    className="outline-warning me-2"
                    onClick={() => onViewDetails("viewShifts", shift)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}

function ExportHoursContent({ onViewDetails, userId }) {
  const [hours, setHours] = useState([]);
  const { sortedData, handleSort, sortSymbol, searchQuery, setSearchQuery } =
    useTableDataProcessing(hours, "event_name");

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    try {
      const response = await fetch(`${API_URL}/api/volunteers/${userId}/hours`);
      const data = await response.json();
      setHours(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching volunteer hours:", error);
      setHours([]);
    }
  };

  const handleExportCSV = () => {
    if (hours.length === 0) {
      alert("No volunteer hours to export.");
      return;
    }

    const headers = Object.keys(hours[0]);
    const csvRows = [
      headers.join(","),
      ...hours.map((row) =>
        headers.map((header) => JSON.stringify(row[header] || "")).join(","),
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `volunteer_hours_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="d-flex justify-content-between mb-3">
        <input
          type="text"
          className="form-control me-2"
          placeholder="Search by event name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="btn-gold" onClick={handleExportCSV}>
          Export CSV
        </button>
      </div>
      <Table hover className="text-center">
        <thead>
          <tr>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("event_name")}
            >
              Event {sortSymbol("event_name")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("event_date")}
            >
              Date {sortSymbol("event_date")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("hours")}
            >
              Hours {sortSymbol("hours")}
            </th>
            <th
              style={{ cursor: "pointer" }}
              onClick={() => handleSort("status")}
            >
              Status {sortSymbol("status")}
            </th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-muted">
                No volunteer hours found.
              </td>
            </tr>
          ) : (
            sortedData.map((entry, index) => (
              <tr key={entry.id || index} className="text-center align-middle">
                <td>{entry.event_name || entry.title}</td>
                <td>{entry.event_date}</td>
                <td>{entry.hours}</td>
                <td>{entry.status}</td>
                <td>
                  <button
                    className="outline-warning me-2"
                    onClick={() => onViewDetails("exportHours", entry)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}

const MODAL_TYPE = {
  subscribedOrgs: {
    title: "Manage Subscribed Organizations",
    Content: SubscribedOrgsContent,
  },
  editAvailability: {
    title: "Edit Availability",
    Content: EditAvailabilityContent,
  },
  contactInfo: {
    title: "Contact Information",
    Content: ContactInfoContent,
  },
  reviewSignups: {
    title: "Review Event Signups",
    Content: ReviewSignupsContent,
  },
  viewShifts: {
    title: "View Shifts",
    Content: ViewShiftsContent,
  },
  exportHours: {
    title: "Export Volunteer Hours",
    Content: ExportHoursContent,
  },
};

function VolunteerModal({ show, onHide, type, userId }) {
  const [detailModalType, setDetailModalType] = useState("");
  const [selectedData, setSelectedData] = useState(null);
  const config = MODAL_TYPE[type];

  const handleViewDetails = (detailType, data) => {
    setSelectedData(data);
    setDetailModalType(detailType);
  };

  return (
    <Modal show={show} className="modal-wide" onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{config?.title || ""}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {config && (
          <config.Content onViewDetails={handleViewDetails} userId={userId} />
        )}
      </Modal.Body>
      <VolunteerDetailsModal
        show={!!detailModalType}
        type={detailModalType}
        data={selectedData}
        onHide={() => {
          setDetailModalType("");
          setSelectedData(null);
        }}
      />
    </Modal>
  );
}

export default VolunteerModal;

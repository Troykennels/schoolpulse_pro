import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../hooks/useApi';
import { Card, Button, Badge, Input, Modal } from '../common/UI';
import { CalendarDays, Plus, ChevronLeft, ChevronRight, MapPin, Clock, Trash2 } from 'lucide-react';
import { formatDate, formatTime, eventTypeColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

const EVENT_TYPES = ['academic', 'holiday', 'exam', 'sports', 'meeting', 'cultural', 'excursion', 'competition', 'assembly', 'other'];
const VISIBILITY = ['all', 'staff', 'parents', 'students'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const defaultForm = () => ({
  title: '',
  description: '',
  event_type: 'academic',
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  location: '',
  visibility: 'all',
  color: '#22A97A',
});

export default function EventsPage() {
  const { user, isTeacher } = useAuth();
  const canManage = ['school_admin', 'super_admin'].includes(user?.role) || isTeacher;
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const { data: eventData, loading, refetch } = useApi(`/events?month=${month}&year=${year}`, { initialData: [] });
  const events = Array.isArray(eventData) ? eventData : [];
  const { mutate: createEvent, loading: creating } = useMutation();
  const { mutate: updateEvent, loading: updating } = useMutation('put');
  const { mutate: deleteEvent } = useMutation('delete');
  const saving = creating || updating;

  const [form, setForm] = useState(defaultForm());
  const set = (k, v) => setForm({ ...form, [k]: v });

  const eventsByDate = useMemo(() => {
    const grouped = {};
    (events || []).forEach((event) => {
      const dateKey = event.start_date?.split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  const calendarDays = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const totalDays = new Date(year, month, 0).getDate();
    const cells = Array.from({ length: first.getDay() }, () => null);
    for (let day = 1; day <= totalDays; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, date, events: eventsByDate[date] || [] });
    }
    return cells;
  }, [eventsByDate, month, year]);

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : events || [];

  const openNew = (date) => {
    setEditing(null);
    setForm({ ...defaultForm(), start_date: date || '' });
    setShowForm(true);
  };

  const openEdit = (event) => {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type || 'academic',
      start_date: event.start_date?.split('T')[0] || '',
      end_date: event.end_date?.split('T')[0] || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location: event.location || '',
      visibility: event.visibility || 'all',
      color: event.color || eventTypeColor(event.event_type),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.start_date) return toast.error('Title and start date are required');
    const payload = { ...form, end_date: form.end_date || form.start_date };
    const { success } = editing
      ? await updateEvent(`/events/${editing.id}`, payload)
      : await createEvent('/events', payload);
    if (success) {
      toast.success(editing ? 'Event updated' : 'Event created');
      setShowForm(false);
      refetch();
    } else {
      toast.error(editing ? 'Could not update event' : 'Could not create event');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    const { success } = await deleteEvent(`/events/${id}`);
    if (success) {
      toast.success('Event deleted');
      refetch();
    }
  };

  const prev = () => {
    setSelectedDate(null);
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else setMonth(month - 1);
  };

  const next = () => {
    setSelectedDate(null);
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>School Calendar</h1>
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 4 }}>Add events, meetings, exams, holidays, and class activities.</p>
        </div>
        {canManage && <Button onClick={() => openNew()} icon={Plus}>Add Event</Button>}
      </div>

      <div className="page-hero" style={{ marginBottom: 'var(--sp-5)' }}>
        <div>
          <Badge variant="amber" dot>{MONTHS[month - 1]} {year}</Badge>
          <h2 style={{ fontSize: '1.35rem', marginTop: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>Plan the school month at a glance</h2>
          <p style={{ color: 'var(--sp-slate-600)', maxWidth: 680 }}>Teachers and admins can add events from the button above or by selecting a calendar day.</p>
        </div>
        <div className="hero-metrics">
          <span>{events.length}<small>events</small></span>
          <span>{Object.keys(eventsByDate).length}<small>active days</small></span>
          <span>{selectedDate ? selectedEvents.length : events.length}<small>listed</small></span>
        </div>
      </div>

      <Card style={{ marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
          <button className="icon-btn" onClick={prev} title="Previous month"><ChevronLeft size={20} /></button>
          <h3 style={{ fontSize: '1.125rem' }}>{MONTHS[month - 1]} {year}</h3>
          <button className="icon-btn" onClick={next} title="Next month"><ChevronRight size={20} /></button>
        </div>
      </Card>

      <div className="events-shell">
        <Card>
          <div className="calendar-grid calendar-head">
            {WEEKDAYS.map(day => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((cell, index) => (
              <button
                key={cell?.date || `empty-${index}`}
                disabled={!cell}
                onClick={() => cell && setSelectedDate(cell.date)}
                onDoubleClick={() => cell && canManage && openNew(cell.date)}
                className={`calendar-cell ${selectedDate === cell?.date ? 'active' : ''}`}
              >
                {cell && (
                  <>
                    <strong>{cell.day}</strong>
                    <div>
                      {cell.events.slice(0, 3).map(event => (
                        <span key={event.id} style={{ background: event.color || eventTypeColor(event.event_type) }}>{event.title}</span>
                      ))}
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
            <div>
              <h3 style={{ fontSize: '1rem' }}>{selectedDate ? formatDate(selectedDate) : 'All Events'}</h3>
              <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.75rem' }}>{selectedEvents.length} scheduled</p>
            </div>
            {selectedDate && <Button variant="secondary" size="sm" onClick={() => setSelectedDate(null)}>Clear</Button>}
          </div>

          {loading ? (
            <p style={{ color: 'var(--sp-slate-400)' }}>Loading events...</p>
          ) : selectedEvents.length === 0 ? (
            <div style={{ padding: 'var(--sp-8)', textAlign: 'center', color: 'var(--sp-slate-400)' }}>
              <CalendarDays size={36} style={{ marginBottom: 'var(--sp-3)' }} />
              <p>No events here yet</p>
              {canManage && <Button size="sm" style={{ marginTop: 'var(--sp-4)' }} onClick={() => openNew(selectedDate)}>Add Event</Button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
              {selectedEvents.map(event => (
                <div key={event.id} className="event-row" onClick={() => canManage && openEdit(event)}>
                  <div style={{ background: event.color || eventTypeColor(event.event_type) }} />
                  <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                      <h4>{event.title}</h4>
                      <Badge variant={event.event_type === 'holiday' ? 'warning' : event.event_type === 'exam' ? 'danger' : 'default'}>{event.event_type}</Badge>
                      <Badge variant="green">{event.visibility || 'all'}</Badge>
                    </div>
                    <p>
                      <span>{formatDate(event.start_date)}{event.end_date && event.end_date !== event.start_date ? ` - ${formatDate(event.end_date)}` : ''}</span>
                      {event.start_time && <span><Clock size={13} />{formatTime(event.start_time)}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}</span>}
                      {event.location && <span><MapPin size={13} />{event.location}</span>}
                    </p>
                    {event.description && <small>{event.description}</small>}
                  </section>
                  {canManage && (
                    <button
                      className="icon-btn danger"
                      onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                      title="Delete event"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Event' : 'New Event'} width={620}>
        <Input label="Title" value={form.title} onChange={e => set('title', e.target.value)} />
        <Input label="Description" type="textarea" value={form.description} onChange={e => set('description', e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 var(--sp-3)' }}>
          <Input label="Type" type="select" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
            {EVENT_TYPES.map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
          </Input>
          <Input label="Visibility" type="select" value={form.visibility} onChange={e => set('visibility', e.target.value)}>
            {VISIBILITY.map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
          </Input>
        </div>
        <Input label="Location" value={form.location} onChange={e => set('location', e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-3)' }}>
          <Input label="Start Date" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          <Input label="End Date" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-3)' }}>
          <Input label="Start Time" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
          <Input label="End Time" type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sp-slate-700)' }}>Color</label>
          <input type="color" value={form.color} onChange={e => set('color', e.target.value)} style={{ width: 42, height: 32, border: '1px solid var(--sp-border)', borderRadius: 8, cursor: 'pointer' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>{editing ? 'Update Event' : 'Create Event'}</Button>
        </div>
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { apiClient } from '@/integrations/api/client';

type Step = 'select-service' | 'select-slot' | 'confirm';

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

const SERVICE_TYPES = [
  { value: 'installation', label: 'Installation' },
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'consultation', label: 'Consultation' },
];

const TENANT_ID = (import.meta as { env: Record<string, string> }).env?.VITE_TENANT_ID || 'default';

export default function CustomerBooking() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('select-service');
  const [loading, setLoading] = useState(false);

  // Form state
  const [serviceType, setServiceType] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Booking result
  const [bookingRef, setBookingRef] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const fetchSlots = async () => {
    if (!serviceType || !date) return;
    setLoading(true);
    try {
      const data = await apiClient.get(
        `/api/customer-booking/availability?serviceType=${serviceType}&date=${date}&tenantId=${TENANT_ID}`,
      );
      setSlots(data.slots || []);
    } catch {
      toast({ title: 'Error', description: 'Could not load available slots.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleServiceNext = async () => {
    if (!serviceType) {
      toast({ title: 'Required', description: 'Please select a service type.', variant: 'destructive' });
      return;
    }
    await fetchSlots();
    setStep('select-slot');
  };

  const handleSlotNext = () => {
    if (!selectedSlot) {
      toast({ title: 'Required', description: 'Please select a time slot.', variant: 'destructive' });
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!customerName || !customerEmail) {
      toast({ title: 'Required', description: 'Name and email are required.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.post('/api/customer-booking/book', {
        tenantId: TENANT_ID,
        customerName,
        customerEmail,
        customerPhone,
        serviceType,
        date: selectedSlot!.date,
        startTime: selectedSlot!.startTime,
        notes,
      });
      setBookingRef(data.bookingReference);
      setConfirmed(true);
    } catch {
      toast({ title: 'Error', description: 'Booking failed. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('select-service');
    setServiceType('');
    setSlots([]);
    setSelectedSlot(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setNotes('');
    setBookingRef('');
    setConfirmed(false);
  };

  if (confirmed) {
    return (
      <div className="max-w-lg mx-auto mt-12 p-4">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
            <p className="text-muted-foreground">
              Your booking reference is:
            </p>
            <Badge variant="outline" className="text-lg px-4 py-2 font-mono">
              {bookingRef}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} on{' '}
              {selectedSlot?.date} at {selectedSlot?.startTime}
            </p>
            <p className="text-sm text-muted-foreground">
              A confirmation will be sent to {customerEmail}
            </p>
            <Button onClick={handleReset} variant="outline" className="mt-4">
              Book Another Appointment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Book a Service</h1>
        <p className="text-muted-foreground mt-1">Schedule your appointment in 3 easy steps</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {(['select-service', 'select-slot', 'confirm'] as Step[]).map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : ['select-service', 'select-slot', 'confirm'].indexOf(step) > idx
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {idx + 1}
            </div>
            <span className={step === s ? 'font-semibold' : 'text-muted-foreground'}>
              {s === 'select-service' ? 'Service' : s === 'select-slot' ? 'Slot' : 'Confirm'}
            </span>
            {idx < 2 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Select Service */}
      {step === 'select-service' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Select Service Type &amp; Date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="serviceType">Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger id="serviceType" className="mt-1">
                  <SelectValue placeholder="Choose a service..." />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Preferred Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleServiceNext} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              See Available Slots
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Slot */}
      {step === 'select-slot' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" /> Choose a Time Slot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Available slots for <strong>{date}</strong>
            </p>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : slots.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No slots available for this date.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot.id}
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      !slot.available
                        ? 'opacity-40 cursor-not-allowed bg-muted'
                        : selectedSlot?.id === slot.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    {slot.startTime} – {slot.endTime}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('select-service')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSlotNext} disabled={!selectedSlot} className="flex-1">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Your Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
              <div><span className="font-medium">Service:</span> {serviceType}</div>
              <div><span className="font-medium">Date:</span> {selectedSlot?.date}</div>
              <div><span className="font-medium">Time:</span> {selectedSlot?.startTime} – {selectedSlot?.endTime}</div>
            </div>

            <div>
              <Label htmlFor="customerName">Full Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Jane Smith"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Email Address *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="jane@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone Number</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special requirements..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('select-slot')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

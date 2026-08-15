import mongoose from 'mongoose';

const workshopSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  hostName: { type: String, required: true },
  hostEmail: { type: String },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hostLinkedIn: { type: String },
  thumbnail: { type: String },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  duration: { type: String, required: true },
  meetingLink: { type: String, required: true },
  googleFormLink: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  showOnHomepage: { type: Boolean, default: false }
}, { timestamps: true });

const Workshop = mongoose.model('Workshop', workshopSchema);

export default Workshop;

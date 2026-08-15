import User from '../models/User.model.js';

export const applyAsTutor = async (req, res, next) => {
  try {
    const { bio, expertise, socials, education } = req.body;
    
    // Bio validation (required, min 50 characters)
    if (!bio || typeof bio !== 'string' || bio.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Bio is required and must be at least 50 characters'
      });
    }

    // Expertise validation (required, non-empty array)
    if (!expertise || !Array.isArray(expertise) || expertise.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Expertise list is required'
      });
    }

    // Socials validation (linkedin is required)
    if (!socials || typeof socials !== 'object' || !socials.linkedin || typeof socials.linkedin !== 'string' || !socials.linkedin.trim()) {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn profile link is required'
      });
    }

    // Education validation (college, course, graduationYear required)
    if (!education || typeof education !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Education details are required'
      });
    }

    const { college, course, graduationYear } = education;
    if (!college || typeof college !== 'string' || !college.trim()) {
      return res.status(400).json({
        success: false,
        message: 'College/University name is required'
      });
    }
    if (!course || typeof course !== 'string' || !course.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Course/Major is required'
      });
    }

    const gradYear = Number(graduationYear);
    if (!graduationYear || isNaN(gradYear) || gradYear < 1900 || gradYear > new Date().getFullYear() + 10) {
      return res.status(400).json({
        success: false,
        message: 'A valid graduation year is required'
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = 'tutor';
    user.tutorStatus = 'pending';
    user.bio = bio;
    user.expertise = expertise;
    user.socials = {
      linkedin: socials.linkedin.trim(),
      googleScholar: socials.googleScholar ? socials.googleScholar.trim() : '',
      orcid: socials.orcid ? socials.orcid.trim() : '',
      medium: socials.medium ? socials.medium.trim() : ''
    };
    user.education = {
      college: college.trim(),
      course: course.trim(),
      graduationYear: gradYear
    };

    await user.save();

    res.json({
      success: true,
      message: 'Tutor application submitted successfully. Pending administrator approval.',
      data: {
        role: user.role,
        tutorStatus: user.tutorStatus,
        bio: user.bio,
        expertise: user.expertise,
        socials: user.socials,
        education: user.education
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getTutors = async (req, res, next) => {
  try {
    const { search, expertise } = req.query;
    const filter = { role: 'tutor', tutorStatus: 'approved' };

    if (expertise) {
      filter.expertise = { $in: expertise.split(',') };
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const tutors = await User.find(filter).select('-password -addresses -wishlist');
    res.json({ success: true, data: tutors });
  } catch (error) {
    next(error);
  }
};

export const getTutorById = async (req, res, next) => {
  try {
    const tutor = await User.findOne({
      _id: req.params.id,
      role: 'tutor',
      tutorStatus: 'approved'
    }).select('-password -addresses -wishlist');

    if (!tutor) {
      return res.status(404).json({ success: false, message: 'Tutor not found or not approved' });
    }

    res.json({ success: true, data: tutor });
  } catch (error) {
    next(error);
  }
};

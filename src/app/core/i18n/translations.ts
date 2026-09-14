export type SupportedLang = 'ar' | 'en';

export interface TranslationDictionary {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const TRANSLATIONS: TranslationDictionary = {
  // Common & Navigation
  'common.appName': { ar: 'وصلة', en: 'Wasla' },
  'common.platformSubtitle': {
    ar: 'منصة الرعاية الصحية المتصلة',
    en: 'Connected Healthcare Platform',
  },
  'common.logout': { ar: 'تسجيل الخروج', en: 'Sign Out' },
  'common.home': { ar: 'الرئيسية', en: 'Home' },
  'common.loading': { ar: 'جارٍ التحميل…', en: 'Loading…' },
  'common.back': { ar: 'رجوع', en: 'Back' },
  'common.save': { ar: 'حفظ', en: 'Save' },
  'common.cancel': { ar: 'إلغاء', en: 'Cancel' },

  // Language Switcher
  'lang.ar': { ar: 'العربية', en: 'Arabic' },
  'lang.en': { ar: 'English', en: 'English' },
  'lang.current': { ar: 'العربية', en: 'English' },
  'lang.switchTarget': { ar: 'English', en: 'العربية' },

  // Auth Layout & Story Panel (Blue Side)
  'story.platformBadge': {
    ar: 'منصة الرعاية الصحية المتصلة',
    en: 'Connected Healthcare Platform',
  },
  'story.mottoLine1': { ar: 'رعاية', en: 'Care' },
  'story.mottoLine2': { ar: 'أقرب لك', en: 'Closer to you' },
  'story.mottoLine3': { ar: 'في كل خطوة', en: 'Every step' },
  'story.headlineWhite': { ar: 'رعاية صحية ذكية', en: 'Smart Healthcare' },
  'story.headlineCyan': {
    ar: 'بين يديك على مدار الساعة.',
    en: 'At your fingertips around the clock.',
  },
  'story.paragraph': {
    ar: 'تواصل مع نخبة المتخصصين، وشارك تاريخك الطبي ومتابع رعايتك بسهولة وأمان.',
    en: 'Connect with top medical specialists, share your health records, and follow up your care securely and effortlessly.',
  },
  'story.stat1Main': { ar: 'مرضى أكثر', en: 'Happier' },
  'story.stat1Desc': { ar: 'سعادة', en: 'Patients' },
  'story.stat2Main': { ar: 'بيانات أكثر', en: 'More Secure' },
  'story.stat2Desc': { ar: 'أماناً', en: 'Medical Data' },
  'story.stat3Main': { ar: 'خدمات أسرع', en: 'Faster Care' },
  'story.stat3Desc': { ar: 'ورعاية أفضل', en: '& Superior Service' },
  'story.tagline': {
    ar: 'معاً.. نحو رعاية صحية أفضل',
    en: 'Together.. Towards better healthcare',
  },
  'story.nextSlide': { ar: 'الشريحة التالية', en: 'Next slide' },
  'story.badgeProfile': { ar: 'الملف الطبي للمريض', en: 'Patient Health Record' },
  'story.badgeHeart': { ar: 'متابعة النبض والقلب', en: 'Heart & Vitals Tracking' },
  'story.badgeHospital': { ar: 'المستشفيات والعيادات', en: 'Hospitals & Clinics' },
  'story.badgeDoc': { ar: 'التقارير الطبية والروشتات', en: 'Medical Reports & Rx' },
  'story.badgeCalendar': { ar: 'المواعيد والاستشارات', en: 'Appointments & Consults' },
  'story.badgeChart': { ar: 'التحليلات والمؤشرات الحيوية', en: 'Health Analytics' },
  'story.badgeVideo': { ar: 'استشارة فيديو مباشرة', en: 'Live Video Consultation' },

  // Auth Layout Footer (Form Side)
  'auth.securityBadge': {
    ar: 'بياناتك الطبية محمية ومشفرة وفق أعلى معايير الأمان',
    en: 'Your medical data is encrypted and protected with top security standards',
  },

  // Login Page
  'login.welcome': { ar: 'مرحبًا بك مجددًا', en: 'Welcome back' },
  'login.title': { ar: 'تسجيل الدخول', en: 'Sign In' },
  'login.subtitle': {
    ar: 'أدخل بيانات حسابك للوصول إلى مساحة العمل الخاصة بك.',
    en: 'Enter your credentials to access your workspace.',
  },
  'login.usernameLabel': {
    ar: 'اسم المستخدم أو البريد الإلكتروني',
    en: 'Username or Email',
  },
  'login.usernamePlaceholder': {
    ar: 'مثال: dr_ahmed أو name@example.com',
    en: 'e.g. dr_ahmed or name@example.com',
  },
  'login.passwordLabel': { ar: 'كلمة المرور', en: 'Password' },
  'login.passwordPlaceholder': { ar: '••••••••', en: '••••••••' },
  'login.forgotPassword': { ar: 'نسيت كلمة المرور؟', en: 'Forgot password?' },
  'login.submit': { ar: 'تسجيل الدخول', en: 'Sign In' },
  'login.submitting': { ar: 'جارٍ تسجيل الدخول…', en: 'Signing in…' },
  'login.orCreate': { ar: 'أو أنشئ حسابًا جديدًا', en: 'Or create a new account' },
  'login.patientAccount': { ar: 'حساب مريض', en: 'Patient Account' },
  'login.patientDesc': {
    ar: 'متابعة السجل الطبي والرعاية',
    en: 'Track medical records and care',
  },
  'login.doctorAccount': { ar: 'حساب طبيب', en: 'Doctor Account' },
  'login.doctorDesc': {
    ar: 'إدارة المرضى والاستشارات',
    en: 'Manage patients and consultations',
  },

  // Registration General
  'register.backToLogin': { ar: 'العودة إلى تسجيل الدخول', en: 'Back to Sign In' },
  'register.patientTitle': { ar: 'إنشاء حساب مريض', en: 'Patient Registration' },
  'register.doctorTitle': { ar: 'إنشاء حساب طبيب', en: 'Doctor Registration' },
  'register.patientSubtitle': {
    ar: 'أنشئ ملفك على وصلة للوصول إلى تاريخك الطبي وخدمات الرعاية المتصلة.',
    en: 'Create your Wasla account to access your medical history and connected care services.',
  },
  'register.doctorSubtitle': {
    ar: 'انضم إلى نخبة أطباء وصلة لتقديم الرعاية الطبية وإدارة الاستشارات بمرونة وكفاءة.',
    en: 'Join Wasla’s medical network to deliver care and manage consultations efficiently.',
  },
  'register.rolePatient': { ar: 'حساب مريض', en: 'Patient' },
  'register.roleDoctor': { ar: 'حساب طبيب', en: 'Doctor' },
  'register.sectionBasic': { ar: 'بيانات الحساب الأساسية', en: 'Account Credentials' },
  'register.sectionPersonal': { ar: 'البيانات الشخصية', en: 'Personal Information' },
  'register.sectionProfessional': {
    ar: 'البيانات المهنية والتخصص',
    en: 'Professional & Specialty',
  },
  'register.sectionDocs': {
    ar: 'الصور والمستندات (اختيارية)',
    en: 'Documents & Verification (Optional)',
  },
  'register.sectionSchedule': { ar: 'مواعيد العمل والاستشارات', en: 'Working Hours & Schedule' },
  'register.username': { ar: 'اسم المستخدم', en: 'Username' },
  'register.email': { ar: 'البريد الإلكتروني', en: 'Email Address' },
  'register.phone': { ar: 'رقم الهاتف', en: 'Phone Number' },
  'register.password': { ar: 'كلمة المرور', en: 'Password' },
  'register.confirmPassword': { ar: 'تأكيد كلمة المرور', en: 'Confirm Password' },
  'register.showPasswords': { ar: 'إظهار كلمات المرور', en: 'Show passwords' },
  'register.fullNameAr': { ar: 'الاسم بالعربية', en: 'Full Name (Arabic)' },
  'register.fullNameEn': {
    ar: 'الاسم بالإنجليزية (اختياري)',
    en: 'Full Name (English - optional)',
  },
  'register.gender': { ar: 'النوع', en: 'Gender' },
  'register.selectGender': { ar: 'اختر النوع', en: 'Select Gender' },
  'register.male': { ar: 'ذكر', en: 'Male' },
  'register.female': { ar: 'أنثى', en: 'Female' },
  'register.dob': { ar: 'تاريخ الميلاد', en: 'Date of Birth' },
  'register.address': { ar: 'العنوان الحالي', en: 'Current Address' },
  'register.emergencyContact': {
    ar: 'رقم هاتف الطوارئ (اختياري)',
    en: 'Emergency Contact (optional)',
  },
  'register.submitPatient': { ar: 'إنشاء حساب مريض', en: 'Create Patient Account' },
  'register.submitDoctor': { ar: 'تقديم طلب تسجيل الطبيب', en: 'Submit Doctor Application' },
  'register.submitting': { ar: 'جارٍ تسجيل الحساب…', en: 'Registering account…' },

  // Post-login: Admin Layout
  'admin.navDoctors': { ar: 'إدارة الأطباء', en: 'Doctors' },
  'admin.navSuperAdmins': { ar: 'إدارة المشرفين', en: 'Super Admins' },
  'admin.navRoles': { ar: 'الأدوار والصلاحيات', en: 'Roles & Permissions' },
  'admin.navSpecializations': { ar: 'التخصصات الطبية', en: 'Specializations' },
  'admin.navRequests': { ar: 'طلبات التخصص', en: 'Specialty Requests' },
  'admin.mainNav': { ar: 'التنقل الرئيسي', en: 'Main Navigation' },

  // Post-login: Doctor Onboarding & Profile
  'doctor.onboardingStatus': { ar: 'حالة الاعتماد', en: 'Onboarding Status' },
  'doctor.completeProfile': { ar: 'إكمال الملف المهني', en: 'Complete Profile' },
  'doctor.profileSetup': { ar: 'إعداد الملف المهني', en: 'Professional Profile Setup' },
  'doctor.specializationAndPractice': {
    ar: 'التخصص وموقع الممارسة',
    en: 'Specialty & Practice Location',
  },
  'doctor.apiReviewNotice': {
    ar: 'البيانات هنا تأتي من Wasla API وتظل قابلة للمراجعة.',
    en: 'Data is synchronized with Wasla API and remains open for review.',
  },
  'doctor.approvedSpecializations': {
    ar: 'التخصصات المعتمدة',
    en: 'Approved Specializations',
  },
  'doctor.activeSet': { ar: 'هذه هي المجموعة الفعالة حاليًا.', en: 'Currently active set.' },
  'doctor.checkingStatus': {
    ar: 'جارٍ تحميل حالة الاعتماد…',
    en: 'Loading onboarding status…',
  },
  'doctor.checkingDetails': {
    ar: 'نتحقق من أحدث حالة مسجلة لدى وصلة.',
    en: 'Checking your latest status on Wasla.',
  },

  // Post-login: Workspace
  'workspace.secureSession': { ar: 'جلسة آمنة وموثقة', en: 'Secure & Authenticated Session' },
  'workspace.welcome': { ar: 'مرحبًا بك', en: 'Welcome' },
  'workspace.readyNotice': {
    ar: 'تم تحميل بيانات حسابك وصلاحياتك من منصة وصلة بنجاح. يمكنك الوصول المباشر للخدمات والوحدات المتاحة أدناه.',
    en: 'Your account data and permissions have loaded successfully from Wasla. You can directly access the available services below.',
  },
  'workspace.accountType': { ar: 'نوع الحساب', en: 'Account Type' },
  'workspace.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'workspace.phone': { ar: 'رقم الهاتف', en: 'Phone Number' },
  'workspace.username': { ar: 'اسم المستخدم', en: 'Username' },
  'workspace.accountInfo': { ar: 'بيانات الحساب', en: 'Account Details' },
  'workspace.availableModules': { ar: 'الخدمات والوحدات المتاحة', en: 'Available Services & Modules' },
  'workspace.manageDoctorProfile': {
    ar: 'التخصص وموقع الممارسة',
    en: 'Specialty & Practice Location',
  },
  'workspace.doctorProfileDesc': {
    ar: 'استكمال بيانات التخصصات الطبية وتحديد مواقع الممارسة والعيادات.',
    en: 'Complete medical specialties and configure practice locations.',
  },
  'workspace.managePatients': { ar: 'إدارة المرضى', en: 'Manage Patients' },
  'workspace.managePatientsDesc': {
    ar: 'البحث عن ملفات المرضى وتسجيل المراجعين الجدد ومتابعة السجلات.',
    en: 'Search patient records and register new clinic visitors.',
  },
  'workspace.familyRequests': { ar: 'طلبات العائلة', en: 'Family Requests' },
  'workspace.familyRequestsDesc': {
    ar: 'متابعة وتدقيق طلبات ربط العلاقات العائلية المساعدة.',
    en: 'Review and process assisted family relationship requests.',
  },
  'workspace.myHealthProfile': { ar: 'ملفي الصحي', en: 'My Health Profile' },
  'workspace.myHealthProfileDesc': {
    ar: 'استعراض التاريخ الطبي والتقارير الصحية والبيانات الشخصية.',
    en: 'Review medical history, health reports, and personal information.',
  },
  'workspace.familyAndRequests': { ar: 'العائلة والطلبات', en: 'Family & Requests' },
  'workspace.familyAndRequestsDesc': {
    ar: 'إدارة أفراد العائلة وتقديم ومتابعة طلبات الربط العائلي.',
    en: 'Manage family members and submit relationship requests.',
  },
  'workspace.platformTagline': {
    ar: 'منصة الرعاية الصحية المتكاملة',
    en: 'Integrated Healthcare Platform',
  },
};


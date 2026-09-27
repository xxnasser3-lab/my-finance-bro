import type { Lang } from './store/types';

const ar = {
  appName: 'بوصلة',
  cur: 'ر.س',
  // nav
  'nav.home': 'الرئيسية', 'nav.wallet': 'المحفظة', 'nav.debts': 'الديون', 'nav.plan': 'الخطة', 'nav.add': 'أضف عملية',
  // common
  save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', add: 'إضافة', back: 'رجوع', close: 'إغلاق', done: 'تم', copy: 'نسخ', copied: 'انتسخ',
  seeAll: 'عرض الكل', none: 'بدون', optional: 'اختياري', today: 'اليوم', yesterday: 'أمس', name: 'الاسم', amount: 'المبلغ', note: 'ملاحظة', date: 'التاريخ',
  confirmDelete: 'متأكد تبي تحذف؟', empty: 'ما فيه شي للحين', more: 'المزيد', day: 'يوم', days: 'يوم', month: 'شهر', months: 'أشهر',
  // lock / onboarding
  'lock.title': 'التطبيق مقفول', 'lock.password': 'كلمة المرور', 'lock.unlock': 'فتح', 'lock.bio': 'فتح بـ Face ID', 'lock.wrong': 'كلمة المرور غلط',
  'lock.forgot': 'نسيت كلمة المرور؟ ما تنسترجع. تقدر تمسح التطبيق وتبدأ من جديد، أو تستعيد نسخة احتياطية تعرف كلمة مرورها.',
  'lock.forgotQ': 'نسيت كلمة المرور؟',
  'lock.restore': 'استعادة نسخة احتياطية', 'lock.wipe': 'مسح وبدء من جديد',
  'ob.welcome': 'أهلاً فيك', 'ob.sub': 'تطبيقك الشخصي لتتبع فلوسك وديونك وخطة التحرر منها. كل شي يبقى على جوالك ومشفّر.',
  'ob.yourName': 'وش نناديك؟', 'ob.salary': 'راتبك الشهري', 'ob.payday': 'يوم نزول الراتب', 'ob.living': 'ميزانية المعيشة الشهرية',
  'ob.livingHint': 'أكل، قهوة، بنزين، مشتريات… بدون الإيجار والأقساط',
  'ob.password': 'كلمة مرور التشفير', 'ob.password2': 'أعد كتابتها', 'ob.passHint': 'تشفّر كل بياناتك. ما تنسترجع لو نسيتها، احفظها في مكان آمن.',
  'ob.mismatch': 'كلمتين المرور مو متطابقة', 'ob.short': 'لازم 6 أحرف أو أكثر',
  'ob.start': 'ابدأ', 'ob.sample': 'جرّب ببيانات تجريبية', 'ob.sampleHint': 'تقدر تمسحها بعدين من الإعدادات', 'ob.next': 'التالي',
  'ob.lang': 'اللغة',
  // home
  'home.hello': 'أهلاً، {name}', 'home.total': 'إجمالي أرصدتك', 'home.netWorth': 'صافي الثروة بعد الديون', 'home.available': 'المتاح للصرف حتى الراتب',
  'home.daysLeft': 'باقي {n} يوم', 'home.todayBudget': 'ميزانية اليوم', 'home.spentToday': 'صرفت اليوم', 'home.spentCycle': 'صرف الدورة',
  'home.chart': 'الصرف مقابل الميزانية', 'home.chartSub': 'تراكمي · الدورة من {d}', 'home.actual': 'الفعلي', 'home.pace': 'المسموح', 'home.forecast': 'التوقع',
  'home.projected': '{v} متوقع', 'home.over': 'بهالمعدل بتصرف {v} هالدورة، أعلى من ميزانيتك بـ {o}. خفّف {d} ريال باليوم وترجع للمسار.',
  'home.under': 'ماشي صح. بهالمعدل بتصرف {v} هالدورة ويتبقى لك {o}.',
  'home.recent': 'آخر العمليات', 'home.upcoming': 'مدفوعات قادمة', 'home.noUpcoming': 'ما عليك مدفوعات قادمة بهالدورة',
  'home.bonus': 'البونص جاي مع راتب {d}', 'home.bonusSub': 'شوف خطة توزيعه', 'home.backup': 'صار لك {n} يوم بدون نسخة احتياطية', 'home.backupNow': 'انسخ الحين',
  'qa.reports': 'التقارير', 'qa.bills': 'الالتزامات', 'qa.trips': 'الرحلات', 'qa.cats': 'التصنيفات', 'qa.txs': 'العمليات',
  // wallet
  'wallet.title': 'المحفظة', 'wallet.total': 'إجمالي الأرصدة', 'wallet.creditAvail': 'متاح في البطاقات', 'wallet.history': 'الرصيد آخر 6 أشهر',
  'wallet.add': 'حساب أو بطاقة', 'wallet.banks': 'الحسابات البنكية', 'wallet.wallets': 'محافظ وكاش', 'wallet.credit': 'البطاقات الائتمانية', 'wallet.transfer': 'تحويل',
  'kindS.bank': 'بنك', 'kindS.credit': 'ائتمانية', 'kindS.wallet': 'محفظة', 'acc.policyHint': 'معبّأة بقيم شائعة، عدّلها حسب بطاقتك عشان تنحسب الأرباح والخطة صح.', 'acc.policyMore': 'رسوم وتفاصيل إضافية (اختياري)',
  'kind.bank': 'حساب بنكي', 'kind.wallet': 'محفظة رقمية', 'kind.cash': 'كاش', 'kind.credit': 'بطاقة ائتمانية',
  'acc.balance': 'الرصيد', 'acc.owed': 'المستحق', 'acc.opening': 'الرصيد الحالي', 'acc.openingCredit': 'المبلغ المستحق حالياً', 'acc.bank': 'البنك', 'acc.network': 'نوع البطاقة',
  'acc.last4': 'آخر 4 أرقام', 'acc.skin': 'شكل البطاقة', 'acc.secrets': 'بيانات البطاقة والحساب', 'acc.secretsOpt': 'بيانات البطاقة للنسخ (اختياري)', 'acc.secretsWhy': 'ما يحتاجها التطبيق عشان يشتغل. أضفها بس إذا تبي تنسخها بسرعة، وتنحفظ مشفّرة على جوالك فقط.', 'acc.reveal': 'إظهار', 'acc.hide': 'إخفاء',
  'acc.holder': 'الاسم على البطاقة', 'acc.number': 'رقم البطاقة', 'acc.expiry': 'تاريخ الانتهاء', 'acc.cvv': 'رمز التحقق CVV', 'acc.iban': 'الآيبان', 'acc.accNumber': 'رقم الحساب',
  'acc.copyAll': 'نسخ كل البيانات', 'acc.secureNote': 'مشفّرة على جوالك وتدخل في النسخة الاحتياطية المشفّرة. الحافظة تنمسح بعد 30 ثانية.',
  'acc.policy': 'سياسة البطاقة', 'acc.limit': 'الحد الائتماني', 'acc.rate': 'نسبة الربح الشهرية %', 'acc.minPct': 'الحد الأدنى للسداد %', 'acc.minAmt': 'أقل مبلغ للحد الأدنى',
  'acc.statementDay': 'يوم كشف الحساب', 'acc.dueDays': 'مهلة السداد (أيام)', 'acc.lateFee': 'رسوم التأخير', 'acc.cashFee': 'رسوم السحب النقدي', 'acc.annualFee': 'الرسوم السنوية', 'acc.cashback': 'الاسترداد النقدي',
  'acc.grace': 'فترة السماح', 'acc.usage': 'استخدام الحد', 'acc.usageHint': 'مستخدم {u} من {l}. الأفضل تحت 30%.', 'acc.statement': 'مبلغ الكشف', 'acc.min': 'الحد الأدنى', 'acc.due': 'آخر موعد',
  'acc.howPay': 'كيف تسددها؟', 'acc.payMin': 'الحد الأدنى فقط', 'acc.payPlan': 'حسب الخطة', 'acc.payFull': 'الرصيد كامل', 'acc.interest': 'الأرباح اللي بتدفعها', 'acc.months': 'تخلص بعد {n} شهر', 'acc.never': 'ما تخلص بهالمبلغ',
  'acc.subs': 'الاشتراكات على البطاقة', 'acc.recordPay': 'سجّل سداد', 'acc.txs': 'العمليات', 'acc.photo': 'صورة البطاقة', 'acc.removePhoto': 'إزالة الصورة', 'acc.archive': 'أرشفة',
  'acc.new': 'حساب أو بطاقة جديدة', 'acc.editTitle': 'تعديل الحساب',
  // tx
  'tx.expense': 'مصروف', 'tx.income': 'دخل', 'tx.transfer': 'تحويل', 'tx.from': 'من', 'tx.to': 'إلى', 'tx.category': 'التصنيف', 'tx.source': 'مصدر الدخل', 'tx.trip': 'رحلة',
  'tx.noTrip': 'بدون رحلة', 'tx.debt': 'مرتبط بدين', 'tx.save': 'حفظ', 'tx.new': 'عملية جديدة', 'tx.edit': 'تعديل العملية', 'tx.leftToday': 'باقي لك اليوم {n}',
  'tx.bnplNote': 'لو اشتريت بتابي أو تمارا أو تساهيل، أضفه من الديون عشان تتوزع الأقساط', 'tx.creditNote': 'ينضاف لرصيد البطاقة المستحق',
  'tx.incomeNote': 'يزيد رصيدك، والخطة تقترح توزيعه', 'tx.transferNote': 'التحويل ما ينحسب مصروف ولا دخل', 'tx.manageCats': 'إدارة التصنيفات',
  'txs.title': 'العمليات', 'txs.search': 'ابحث في العمليات', 'txs.all': 'الكل',
  // reports
  'rep.title': 'التقارير', 'rep.weekly': 'أسبوعي', 'rep.monthly': 'شهري', 'rep.income': 'الدخل', 'rep.expense': 'المصروف', 'rep.net': 'الصافي', 'rep.saveRate': 'نسبة الادخار',
  'rep.avgDay': 'متوسط يومي', 'rep.byCat': 'حسب التصنيف', 'rep.sources': 'مصادر الدخل', 'rep.trips': 'الرحلات بهالفترة', 'rep.chartM': 'الدخل والمصروف · 6 أشهر',
  'rep.chartW': 'الصرف اليومي', 'rep.showMore': 'عرض {n} تصنيفات أخرى', 'rep.vsPrev': '{d} من الفترة اللي قبلها', 'rep.less': 'أقل {p}%', 'rep.moreP': 'أعلى {p}%', 'rep.week': 'أسبوع',
  'rep.ofIncome': 'من الدخل', 'rep.export': 'تصدير CSV', 'rep.debtPay': 'سداد الديون',
  // commitments
  'com.title': 'الالتزامات والاشتراكات', 'com.monthly': 'بالشهر', 'com.fixed': 'ثابتة', 'com.subs': 'اشتراكات', 'com.yearly': 'الاشتراكات تكلفك {v} بالسنة',
  'com.defaultCard': 'بطاقة الاشتراكات الافتراضية', 'com.change': 'تغيير', 'com.new': 'التزام أو اشتراك جديد', 'com.kind': 'النوع', 'com.day': 'يوم الدفع',
  'com.cycle': 'التكرار', 'com.monthlyC': 'شهري', 'com.yearlyC': 'سنوي', 'com.payFrom': 'يندفع من', 'com.variable': 'المبلغ متغير (متوسط)', 'com.paid': 'مدفوع',
  'com.markPaid': 'سجّل الدفع', 'com.legendFixed': 'التزام ثابت', 'com.legendSub': 'اشتراك', 'com.legendInst': 'قسط', 'com.month': 'شهر الدفع',
  // categories
  'cat.title': 'التصنيفات', 'cat.expense': 'المصاريف', 'cat.income': 'الدخل', 'cat.new': 'تصنيف جديد', 'cat.icon': 'الأيقونة', 'cat.color': 'اللون', 'cat.parent': 'تحت تصنيف',
  'cat.main': 'بدون (رئيسي)', 'cat.budget': 'ميزانية شهرية', 'cat.living': 'ينحسب من ميزانية المعيشة اليومية', 'cat.sub': 'فرعي', 'cat.thisMonth': 'هالشهر', 'cat.subs': '{n} فرعية',
  // trips
  'trip.title': 'الرحلات', 'trip.new': 'رحلة جديدة', 'trip.budget': 'الميزانية', 'trip.start': 'من', 'trip.end': 'إلى', 'trip.spent': 'من ميزانية {b}',
  'trip.left': 'باقي', 'trip.avg': 'متوسط اليوم', 'trip.count': 'عمليات', 'trip.byDay': 'الصرف يوم بيوم', 'trip.byCat': 'وين راحت الفلوس', 'trip.active': 'جارية', 'trip.ended': 'منتهية', 'trip.others': 'رحلات ثانية',
  // debts
  'debt.title': 'الديون', 'debt.remaining': 'المتبقي عليك', 'debt.freeIn': 'تتحرر في', 'debt.paidYear': 'سددت هالسنة', 'debt.mix': 'توزيع الديون',
  'debt.new': 'دين جديد', 'debt.kind': 'نوع الدين', 'kindD.loan': 'قرض', 'kindD.card': 'بطاقة ائتمانية', 'kindD.bnpl': 'اشترِ الآن وادفع لاحقاً', 'kindD.person': 'شخص',
  'debt.cards': 'البطاقات الائتمانية', 'debt.bnpl': 'اشترِ الآن وادفع لاحقاً', 'debt.loans': 'القروض', 'debt.people': 'أشخاص', 'debt.iOwe': 'علي لهم', 'debt.owedMe': 'لي عندهم',
  'debt.provider': 'الشركة', 'prov.tabby': 'تابي', 'prov.tamara': 'تمارا', 'prov.tasaheel': 'تساهيل', 'prov.other': 'أخرى',
  'debt.principal': 'المبلغ الأصلي', 'debt.opening': 'المتبقي الحين', 'debt.installment': 'القسط', 'debt.installments': 'عدد الأقساط', 'debt.frequency': 'كل',
  'freq.monthly': 'شهر', 'freq.biweekly': 'أسبوعين', 'debt.nextDue': 'موعد القسط الجاي', 'debt.rate': 'نسبة الربح السنوية %', 'debt.dueDay': 'يوم القسط',
  'debt.monthly': 'الاتفاق الشهري', 'debt.direction': 'الاتجاه', 'debt.agreement': 'الاتفاق', 'debt.avatar': 'الصورة أو الأفتار', 'debt.photo': 'صورة من الجوال',
  'debt.linkCard': 'البطاقة', 'debt.paid': '{p} من {t} مدفوعة', 'debt.next': 'الجاي {d}', 'debt.pay': 'سجّل دفعة', 'debt.borrow': 'استلفت زيادة', 'debt.lend': 'سلّفته زيادة',
  'debt.received': 'استلمت منه', 'debt.history': 'السجل', 'debt.inPlan': 'في الخطة', 'debt.ends': 'يخلص {d}', 'debt.flexible': 'مرن، بدون موعد', 'debt.close': 'قفل الدين',
  'debt.paidOff': 'خلص', 'debt.for': 'على وش؟', 'debt.addCardFirst': 'أضف البطاقة من المحفظة أول',
  // plan
  'plan.title': 'خطة التحرر من الديون', 'plan.live': 'تتحدث تلقائياً', 'plan.freeIn': 'تتحرر من كل ديونك في', 'plan.onTrack': 'على المسار الحالي',
  'plan.earlier': 'أبكر بـ {n} شهر بميزانية معيشة {v}', 'plan.later': 'متأخر {n} شهر بميزانية معيشة {v}', 'plan.avalanche': 'الأعلى تكلفة أولاً', 'plan.snowball': 'الأصغر أولاً',
  'plan.avaNote': 'تبدأ بالدين اللي عليه أرباح أعلى، وتوفر أكبر مبلغ.', 'plan.snowNote': 'تقفل الديون الصغيرة أول عشان تحس بالإنجاز.',
  'plan.chart': 'مسار الديون', 'plan.chartSub': 'إجمالي المتبقي شهر بشهر', 'plan.whatIf': 'ماذا لو؟', 'plan.slide': 'حرّك الشريط', 'plan.livingBudget': 'ميزانية المعيشة الشهرية',
  'plan.alloc': 'توزيع الراتب', 'plan.fixed': 'التزامات واشتراكات', 'plan.mins': 'أقساط وحد أدنى', 'plan.living': 'مصاريف المعيشة', 'plan.save': 'ادخار', 'plan.savePaused': 'ادخار (موقوف مؤقتاً)',
  'plan.extra': 'دفعة إضافية على الديون', 'plan.order': 'ترتيب السداد', 'plan.bnplNote': 'تابي وتمارا وتساهيل تمشي على جدولها لأنها بدون أرباح.',
  'plan.bonus': 'بونص {d}', 'plan.bonusDebt': 'الديون', 'plan.bonusSave': 'الادخار', 'plan.bonusYou': 'لك', 'plan.emergency': 'صندوق الطوارئ',
  'plan.emergencyNote': 'الادخار يتعدّل حسب وضعك: إذا الفائض قلّ يوقف مؤقتاً وتروح الأولوية للديون.', 'plan.noDebts': 'ما عليك ديون. ممتاز!',
  'plan.deficit': 'دخلك ما يغطي التزاماتك بهالميزانية. قلّل المعيشة أو راجع الالتزامات.', 'plan.interestSaved': 'الفرق بين الطريقتين: {v} أرباح', 'plan.never': 'أكثر من 5 سنوات',

  // advisor
  'tip.deficit': 'عجز {v} حتى الراتب، يعني {w} ريال باليوم. شوف خطة سد العجز.',
  'tip.monthlyDeficit': 'التزاماتك الشهرية أعلى من راتبك بـ {v}. لازم نخفف شي ثابت.',
  'tip.surplus': 'متوقع يتبقى لك {v} قبل الراتب. حوّل جزء منه للبطاقة أو الطوارئ.',
  'tip.catOver': 'صرفت على {label} {v} من ميزانية {w} هالشهر.',
  'tip.cardDue': 'سدد {v} من {label} قبل {date} وتوفر أرباح حوالي {w}. أقل شي الحد الأدنى {x}.',
  'tip.extraIncome': 'جاك {v} دخل إضافي هالدورة. اقتراح: {w} للديون و{x} للطوارئ.',
  'tip.emergencyLow': 'صندوق الطوارئ {v}، أقل من مصاريف شهر واحد ({w}).',
  'tip.dailyCost': '{label} يكلفك {v} بالشهر و{w} بالسنة.',
  'tip.optionalSubs': 'عندك اشتراكات تقدر تستغني عنها بـ {v} بالشهر ({w} بالسنة).',
  'tip.pace': 'صرفك أسرع من الميزانية. خفّف {v} ريال باليوم وترجع للمسار.',
  'adv.title': 'الاقتراحات والعجز', 'adv.untilPay': 'وضعك حتى الراتب', 'adv.payOn': 'الراتب {d}', 'adv.cash': 'فلوسك الحين', 'adv.noEmergency': 'بدون صندوق الطوارئ',
  'adv.bills': 'التزامات قبل الراتب', 'adv.living': 'باقي ميزانية المعيشة', 'adv.result': 'يتبقى لك', 'adv.shortfall': 'العجز',
  'adv.perDay': '{v} باليوم لـ {n} يوم', 'adv.freePerDay': 'فلوسك بعد الالتزامات مقسومة على الأيام الباقية', 'adv.shortPerDay': 'العجز مقسوم على الأيام الباقية',
  'adv.plan': 'خطة سد العجز', 'adv.planSub': 'من الأسهل للأصعب. كل خطوة تقلل العجز.', 'adv.left': 'يتبقى عجز {v}', 'adv.covered': 'كذا تغطى العجز',
  'adv.still': 'حتى بعد كل الخطوات يتبقى {v}. تحتاج دخل إضافي أو تأجيل التزام ضروري.',
  'adv.saves': 'يوفر {v}', 'adv.dont': 'لا تسوي', 'adv.monthly': 'الصورة الشهرية', 'adv.gap': 'الفرق كل شهر', 'adv.tips': 'اقتراحات',
  'adv.noTips': 'كل شي تمام، ما عندي اقتراحات الحين.', 'adv.setPriorities': 'حدد أهمية كل التزام', 'adv.billsList': 'الالتزامات حتى الراتب',
  'adv.salary': 'الراتب', 'adv.fixed': 'التزامات واشتراكات', 'adv.daily': 'مصاريف يومية ثابتة', 'adv.mins': 'أقساط وحد أدنى', 'adv.livingB': 'ميزانية المعيشة',
  'dont.cash': 'لا تسحب كاش من البطاقة الائتمانية. عليه رسوم وأرباح من أول يوم.',
  'dont.bnpl': 'لا تشتري بتابي أو تمارا عشان تسد العجز. بس تأجّل المشكلة للشهر الجاي.',
  'dont.min': 'لا تفوّت الحد الأدنى للبطاقة. رسوم تأخير وتأثير على سجلك في سمة.',
  'dont.loan': 'لا تاخذ سلفة جديدة إلا إذا ضروري وموعد سدادها واضح.',
  'step.pauseSub': 'أجّل أو أوقف {label}', 'step.trimDaily': 'خفّف {label} للنص', 'step.stopDaily': 'وقّف {label} لين الراتب ({a} يوم)',
  'step.cutLiving': 'خفّض صرفك اليومي من {a} إلى {b}', 'step.cardMin': 'سدد الحد الأدنى {a} بس هالمرة', 'step.cardMinSub': 'بيكلفك أرباح حوالي {b} الشهر الجاي',
  'step.askDelay': 'اطلب من {label} تأجيل الدفعة', 'step.dropImportant': 'شوف إذا تقدر تأجل {label}', 'step.useEmergency': 'آخر حل: خذ من صندوق الطوارئ',
  'pri.essential': 'ضروري', 'pri.important': 'مهم', 'pri.optional': 'أستغني عنه', 'com.priority': 'الأهمية وقت العجز',
  'com.daily': 'يومية', 'com.weekdays': 'الأيام', 'com.everyDay': 'كل يوم', 'com.auto': 'سجّلها تلقائياً', 'com.autoHint': 'تنضاف لحالها كل يوم. إذا يوم ما شريت، احذفها من العمليات.',
  'com.perDay': 'باليوم', 'com.monthlyEq': '≈ {v} بالشهر', 'com.dailyHint': 'شي تشتريه غالباً كل يوم (دخان، قهوة، مواصلات…)',
  'home.perDay': 'يعني {v} باليوم لـ {n} يوم الباقية', 'home.capped': 'ميزانيتك {v} بس فلوسك بعد الالتزامات ما تكفيها. شوف الاقتراحات.', 'home.tips': 'اقتراحات', 'home.untilPay': 'حتى الراتب', 'home.autoLogged': 'انسجل تلقائياً اليوم: {label}', 'home.undoAuto': 'ما شريت اليوم',
  // settings
  'set.title': 'الإعدادات', 'set.lang': 'اللغة', 'set.langNote': 'التطبيق كله يتقلب حسب اللغة: الاتجاه والترتيب والأسهم. الأرقام تبقى إنجليزية في اللغتين.',
  'set.income': 'الدخل', 'set.salary': 'الراتب الشهري', 'set.payday': 'يوم نزول الراتب', 'set.paydaySub': 'الدورة المالية تبدأ من هاليوم', 'set.salaryAcc': 'ينزل في',
  'set.bonus': 'البونص', 'set.bonusOn': 'عندي بونص', 'set.bonusEvery': 'كل كم شهر', 'set.bonusNext': 'البونص الجاي', 'set.bonusAmount': 'المبلغ المتوقع',
  'set.bonusSplit': 'توزيع البونص (ديون / ادخار %)', 'set.plan': 'الخطة', 'set.living': 'ميزانية المعيشة', 'set.saveMonthly': 'الادخار الشهري', 'set.emergencyTarget': 'هدف صندوق الطوارئ',
  'set.emergencyAcc': 'حساب الطوارئ', 'set.manage': 'التخصيص', 'set.subsCard': 'بطاقة الاشتراكات', 'set.security': 'الأمان', 'set.bio': 'فتح بـ Face ID',
  'set.bioSub': 'بدل كتابة كلمة المرور كل مرة', 'set.bioNA': 'جهازك ما يدعم', 'set.changePass': 'تغيير كلمة المرور', 'set.lockNow': 'قفل الآن', 'set.hide': 'إخفاء المبالغ',
  'set.data': 'بياناتك والنسخ الاحتياطي', 'set.dataNote': 'بياناتك على جوالك ومشفّرة، وما تنرفع لـ GitHub ولا لأي سيرفر.',
  'set.backupNow': 'نسخة احتياطية الآن', 'set.backupSub': 'ملف مشفّر تحفظه في iCloud أو الملفات', 'set.restore': 'استعادة نسخة', 'set.csv': 'تصدير العمليات Excel (CSV)',
  'set.lastBackup': 'آخر نسخة: {d}', 'set.never': 'ما سويت نسخة للحين', 'set.drive': 'Google Drive', 'set.driveSub': 'نسخ مشفّر في مجلد خاص بالتطبيق',
  'set.driveClient': 'Google Client ID', 'set.driveConnect': 'ربط ورفع نسخة', 'set.driveRestore': 'استعادة آخر نسخة من Drive', 'set.driveNeed': 'حط Client ID أول (الشرح في README)',
  'set.driveDone': 'انرفعت النسخة على Drive', 'set.driveLast': 'آخر نسخة على Drive: {d}', 'set.wipe': 'حذف كل البيانات', 'set.wipeConfirm': 'بينحذف كل شي نهائياً. متأكد؟',
  'set.restorePass': 'كلمة مرور النسخة', 'set.restored': 'رجعت بياناتك', 'set.restoreFail': 'ما قدرت أفتح النسخة، تأكد من كلمة المرور',
  'set.oldPass': 'كلمة المرور الحالية', 'set.newPass': 'كلمة المرور الجديدة', 'set.passChanged': 'تغيّرت كلمة المرور', 'set.remind': 'تذكير قبل الدفع (أيام)', 'set.name': 'اسمك',
  'set.version': 'الإصدار', 'set.installHint': 'للتثبيت: من Safari اضغط مشاركة ثم "إضافة إلى الشاشة الرئيسية"'
};

export type Key = keyof typeof ar;

const en: Record<Key, string> = {
  appName: 'Bousla',
  cur: 'SAR',
  'nav.home': 'Home', 'nav.wallet': 'Wallet', 'nav.debts': 'Debts', 'nav.plan': 'Plan', 'nav.add': 'Add transaction',
  save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add', back: 'Back', close: 'Close', done: 'Done', copy: 'Copy', copied: 'Copied',
  seeAll: 'See all', none: 'None', optional: 'optional', today: 'Today', yesterday: 'Yesterday', name: 'Name', amount: 'Amount', note: 'Note', date: 'Date',
  confirmDelete: 'Delete this?', empty: 'Nothing here yet', more: 'More', day: 'day', days: 'days', month: 'month', months: 'months',
  'lock.title': 'App is locked', 'lock.password': 'Password', 'lock.unlock': 'Unlock', 'lock.bio': 'Unlock with Face ID', 'lock.wrong': 'Wrong password',
  'lock.forgot': 'Forgot it? It cannot be recovered. You can wipe the app and start over, or restore a backup whose password you know.',
  'lock.forgotQ': 'Forgot your password?',
  'lock.restore': 'Restore a backup', 'lock.wipe': 'Wipe and start over',
  'ob.welcome': 'Welcome', 'ob.sub': 'Your personal app for tracking money, debts and your plan to be debt-free. Everything stays on your phone, encrypted.',
  'ob.yourName': 'What should we call you?', 'ob.salary': 'Monthly salary', 'ob.payday': 'Payday', 'ob.living': 'Monthly living budget',
  'ob.livingHint': 'Food, coffee, fuel, shopping… not rent or installments',
  'ob.password': 'Encryption password', 'ob.password2': 'Repeat it', 'ob.passHint': 'It encrypts all your data. It cannot be recovered if you forget it — keep it somewhere safe.',
  'ob.mismatch': 'Passwords do not match', 'ob.short': 'At least 6 characters',
  'ob.start': 'Start', 'ob.sample': 'Try with sample data', 'ob.sampleHint': 'You can wipe it later in Settings', 'ob.next': 'Next',
  'ob.lang': 'Language',
  'home.hello': 'Hi, {name}', 'home.total': 'Total balance', 'home.netWorth': 'Net worth after debts', 'home.available': 'Safe to spend until payday',
  'home.daysLeft': '{n} days left', 'home.todayBudget': 'Today’s budget', 'home.spentToday': 'Spent today', 'home.spentCycle': 'This cycle',
  'home.chart': 'Spending vs. budget', 'home.chartSub': 'Cumulative · cycle from {d}', 'home.actual': 'Actual', 'home.pace': 'Allowed', 'home.forecast': 'Forecast',
  'home.projected': '{v} projected', 'home.over': 'At this pace you’ll spend {v} this cycle, {o} over budget. Cut {d} SAR a day to get back on track.',
  'home.under': 'On track. At this pace you’ll spend {v} this cycle and keep {o}.',
  'home.recent': 'Recent activity', 'home.upcoming': 'Upcoming payments', 'home.noUpcoming': 'No payments due this cycle',
  'home.bonus': 'Bonus arrives with the {d} salary', 'home.bonusSub': 'See the allocation plan', 'home.backup': '{n} days since your last backup', 'home.backupNow': 'Back up now',
  'qa.reports': 'Reports', 'qa.bills': 'Bills', 'qa.trips': 'Trips', 'qa.cats': 'Categories', 'qa.txs': 'Activity',
  'wallet.title': 'Wallet', 'wallet.total': 'Total balance', 'wallet.creditAvail': 'Available on cards', 'wallet.history': 'Balance, last 6 months',
  'wallet.add': 'Account or card', 'wallet.banks': 'Bank accounts', 'wallet.wallets': 'Wallets & cash', 'wallet.credit': 'Credit cards', 'wallet.transfer': 'Transfer',
  'kindS.bank': 'Bank', 'kindS.credit': 'Credit', 'kindS.wallet': 'Wallet', 'acc.policyHint': 'Prefilled with common values — adjust to your card so profit and the plan are accurate.', 'acc.policyMore': 'Fees & extra details (optional)',
  'kind.bank': 'Bank account', 'kind.wallet': 'Digital wallet', 'kind.cash': 'Cash', 'kind.credit': 'Credit card',
  'acc.balance': 'Balance', 'acc.owed': 'Owed', 'acc.opening': 'Current balance', 'acc.openingCredit': 'Amount owed now', 'acc.bank': 'Bank', 'acc.network': 'Card network',
  'acc.last4': 'Last 4 digits', 'acc.skin': 'Card look', 'acc.secrets': 'Card & account details', 'acc.secretsOpt': 'Card details for copying (optional)', 'acc.secretsWhy': 'The app works without them. Add them only if you want quick copy; they stay encrypted on your phone.', 'acc.reveal': 'Reveal', 'acc.hide': 'Hide',
  'acc.holder': 'Name on card', 'acc.number': 'Card number', 'acc.expiry': 'Expiry', 'acc.cvv': 'CVV', 'acc.iban': 'IBAN', 'acc.accNumber': 'Account number',
  'acc.copyAll': 'Copy all details', 'acc.secureNote': 'Encrypted on your phone and included in the encrypted backup. Clipboard clears after 30 seconds.',
  'acc.policy': 'Card policy', 'acc.limit': 'Credit limit', 'acc.rate': 'Monthly profit rate %', 'acc.minPct': 'Minimum payment %', 'acc.minAmt': 'Minimum payment floor',
  'acc.statementDay': 'Statement day', 'acc.dueDays': 'Days to pay', 'acc.lateFee': 'Late fee', 'acc.cashFee': 'Cash advance fee', 'acc.annualFee': 'Annual fee', 'acc.cashback': 'Cashback',
  'acc.grace': 'Grace period', 'acc.usage': 'Limit used', 'acc.usageHint': '{u} of {l} used. Best kept under 30%.', 'acc.statement': 'Statement', 'acc.min': 'Minimum', 'acc.due': 'Due',
  'acc.howPay': 'How to pay it off?', 'acc.payMin': 'Minimum only', 'acc.payPlan': 'Per plan', 'acc.payFull': 'Full balance', 'acc.interest': 'Profit you’ll pay', 'acc.months': 'Paid off in {n} months', 'acc.never': 'Never at this amount',
  'acc.subs': 'Subscriptions on this card', 'acc.recordPay': 'Record payment', 'acc.txs': 'Transactions', 'acc.photo': 'Card photo', 'acc.removePhoto': 'Remove photo', 'acc.archive': 'Archive',
  'acc.new': 'New account or card', 'acc.editTitle': 'Edit account',
  'tx.expense': 'Expense', 'tx.income': 'Income', 'tx.transfer': 'Transfer', 'tx.from': 'From', 'tx.to': 'To', 'tx.category': 'Category', 'tx.source': 'Income source', 'tx.trip': 'Trip',
  'tx.noTrip': 'No trip', 'tx.debt': 'Linked debt', 'tx.save': 'Save', 'tx.new': 'New transaction', 'tx.edit': 'Edit transaction', 'tx.leftToday': '{n} left today',
  'tx.bnplNote': 'Bought with Tabby, Tamara or Tasaheel? Add it under Debts so the installments are tracked', 'tx.creditNote': 'Added to the card balance',
  'tx.incomeNote': 'Increases your balance; the plan suggests how to use it', 'tx.transferNote': 'Transfers are neither spending nor income', 'tx.manageCats': 'Manage categories',
  'txs.title': 'Activity', 'txs.search': 'Search activity', 'txs.all': 'All',
  'rep.title': 'Reports', 'rep.weekly': 'Weekly', 'rep.monthly': 'Monthly', 'rep.income': 'Income', 'rep.expense': 'Spending', 'rep.net': 'Net', 'rep.saveRate': 'Savings rate',
  'rep.avgDay': 'Daily average', 'rep.byCat': 'By category', 'rep.sources': 'Income sources', 'rep.trips': 'Trips in this period', 'rep.chartM': 'Income & spending · 6 months',
  'rep.chartW': 'Daily spending', 'rep.showMore': 'Show {n} more categories', 'rep.vsPrev': '{d} vs previous period', 'rep.less': '{p}% lower', 'rep.moreP': '{p}% higher', 'rep.week': 'Week',
  'rep.ofIncome': 'of income', 'rep.export': 'Export CSV', 'rep.debtPay': 'Debt payments',
  'com.title': 'Bills & subscriptions', 'com.monthly': 'Monthly', 'com.fixed': 'Fixed', 'com.subs': 'Subscriptions', 'com.yearly': 'Subscriptions cost you {v} a year',
  'com.defaultCard': 'Default subscriptions card', 'com.change': 'Change', 'com.new': 'New bill or subscription', 'com.kind': 'Type', 'com.day': 'Payment day',
  'com.cycle': 'Repeats', 'com.monthlyC': 'Monthly', 'com.yearlyC': 'Yearly', 'com.payFrom': 'Paid from', 'com.variable': 'Amount varies (average)', 'com.paid': 'Paid',
  'com.markPaid': 'Mark paid', 'com.legendFixed': 'Fixed bill', 'com.legendSub': 'Subscription', 'com.legendInst': 'Installment', 'com.month': 'Payment month',
  'cat.title': 'Categories', 'cat.expense': 'Spending', 'cat.income': 'Income', 'cat.new': 'New category', 'cat.icon': 'Icon', 'cat.color': 'Color', 'cat.parent': 'Under',
  'cat.main': 'None (main)', 'cat.budget': 'Monthly budget', 'cat.living': 'Counts against the daily living budget', 'cat.sub': 'Sub', 'cat.thisMonth': 'This month', 'cat.subs': '{n} sub-categories',
  'trip.title': 'Trips', 'trip.new': 'New trip', 'trip.budget': 'Budget', 'trip.start': 'From', 'trip.end': 'To', 'trip.spent': 'of {b} budget',
  'trip.left': 'Left', 'trip.avg': 'Per day', 'trip.count': 'Transactions', 'trip.byDay': 'Day by day', 'trip.byCat': 'Where it went', 'trip.active': 'Ongoing', 'trip.ended': 'Ended', 'trip.others': 'Other trips',
  'debt.title': 'Debts', 'debt.remaining': 'You owe', 'debt.freeIn': 'Debt-free in', 'debt.paidYear': 'Paid this year', 'debt.mix': 'Debt mix',
  'debt.new': 'New debt', 'debt.kind': 'Debt type', 'kindD.loan': 'Loan', 'kindD.card': 'Credit card', 'kindD.bnpl': 'Buy now, pay later', 'kindD.person': 'Person',
  'debt.cards': 'Credit cards', 'debt.bnpl': 'Buy now, pay later', 'debt.loans': 'Loans', 'debt.people': 'People', 'debt.iOwe': 'I owe', 'debt.owedMe': 'Owed to me',
  'debt.provider': 'Provider', 'prov.tabby': 'Tabby', 'prov.tamara': 'Tamara', 'prov.tasaheel': 'Tasaheel', 'prov.other': 'Other',
  'debt.principal': 'Original amount', 'debt.opening': 'Remaining now', 'debt.installment': 'Installment', 'debt.installments': 'Installments', 'debt.frequency': 'Every',
  'freq.monthly': 'month', 'freq.biweekly': '2 weeks', 'debt.nextDue': 'Next due date', 'debt.rate': 'Annual profit rate %', 'debt.dueDay': 'Due day',
  'debt.monthly': 'Monthly agreement', 'debt.direction': 'Direction', 'debt.agreement': 'Agreement', 'debt.avatar': 'Photo or avatar', 'debt.photo': 'Photo',
  'debt.linkCard': 'Card', 'debt.paid': '{p} of {t} paid', 'debt.next': 'next {d}', 'debt.pay': 'Record payment', 'debt.borrow': 'Borrowed more', 'debt.lend': 'Lent more',
  'debt.received': 'Received', 'debt.history': 'History', 'debt.inPlan': 'In the plan', 'debt.ends': 'Done {d}', 'debt.flexible': 'Flexible, no date', 'debt.close': 'Close debt',
  'debt.paidOff': 'Paid off', 'debt.for': 'For what?', 'debt.addCardFirst': 'Add the card in Wallet first',
  'plan.title': 'Debt-free plan', 'plan.live': 'Updates live', 'plan.freeIn': 'You’ll be debt-free in', 'plan.onTrack': 'On the current track',
  'plan.earlier': '{n} months earlier with a {v} living budget', 'plan.later': '{n} months later with a {v} living budget', 'plan.avalanche': 'Costliest first', 'plan.snowball': 'Smallest first',
  'plan.avaNote': 'Start with the debt that charges the most profit. Saves the most money.', 'plan.snowNote': 'Close the small debts first for quick wins.',
  'plan.chart': 'Debt path', 'plan.chartSub': 'Total remaining, month by month', 'plan.whatIf': 'What if?', 'plan.slide': 'Drag the slider', 'plan.livingBudget': 'Monthly living budget',
  'plan.alloc': 'Where your salary goes', 'plan.fixed': 'Bills & subscriptions', 'plan.mins': 'Installments & minimums', 'plan.living': 'Living costs', 'plan.save': 'Savings', 'plan.savePaused': 'Savings (paused)',
  'plan.extra': 'Extra toward debts', 'plan.order': 'Payoff order', 'plan.bnplNote': 'Tabby, Tamara and Tasaheel stay on schedule since they charge no profit.',
  'plan.bonus': 'Bonus {d}', 'plan.bonusDebt': 'Debts', 'plan.bonusSave': 'Savings', 'plan.bonusYou': 'For you', 'plan.emergency': 'Emergency fund',
  'plan.emergencyNote': 'Savings adapt: when the surplus shrinks, saving pauses and debts come first.', 'plan.noDebts': 'No debts. Great!',
  'plan.deficit': 'Your income doesn’t cover your commitments at this budget. Lower living costs or review bills.', 'plan.interestSaved': 'Difference between methods: {v} in profit', 'plan.never': 'More than 5 years',

  'tip.deficit': 'Short {v} until payday — that’s {w} SAR a day. See the plan to close it.',
  'tip.monthlyDeficit': 'Your monthly commitments exceed your salary by {v}. Something fixed has to go.',
  'tip.surplus': 'You should have {v} left before payday. Move some to your card or emergency fund.',
  'tip.catOver': 'You spent {v} on {label} this month against a {w} budget.',
  'tip.cardDue': 'Pay {v} on {label} before {date} to save about {w} in profit. At least the {x} minimum.',
  'tip.extraIncome': 'You got {v} of extra income this cycle. Suggestion: {w} to debts and {x} to savings.',
  'tip.emergencyLow': 'Emergency fund is {v}, less than one month of costs ({w}).',
  'tip.dailyCost': '{label} costs you {v} a month and {w} a year.',
  'tip.optionalSubs': 'You have {v}/month of subscriptions you could drop ({w} a year).',
  'tip.pace': 'You’re spending faster than budget. Cut {v} SAR a day to get back on track.',
  'adv.title': 'Advice & shortfalls', 'adv.untilPay': 'Until payday', 'adv.payOn': 'Payday {d}', 'adv.cash': 'Cash now', 'adv.noEmergency': 'excluding emergency fund',
  'adv.bills': 'Bills before payday', 'adv.living': 'Living budget left', 'adv.result': 'Left over', 'adv.shortfall': 'Shortfall',
  'adv.perDay': '{v} a day for {n} days', 'adv.freePerDay': 'Cash after bills, spread over the days left', 'adv.shortPerDay': 'Shortfall spread over the days left',
  'adv.plan': 'Plan to close the gap', 'adv.planSub': 'Easiest first. Each step shrinks the shortfall.', 'adv.left': '{v} still short', 'adv.covered': 'Gap covered',
  'adv.still': 'Even after every step you’re {v} short. You need extra income or to delay an essential bill.',
  'adv.saves': 'Saves {v}', 'adv.dont': 'Don’t', 'adv.monthly': 'Monthly picture', 'adv.gap': 'Monthly difference', 'adv.tips': 'Suggestions',
  'adv.noTips': 'All good — no suggestions right now.', 'adv.setPriorities': 'Set how important each bill is', 'adv.billsList': 'Bills until payday',
  'adv.salary': 'Salary', 'adv.fixed': 'Bills & subscriptions', 'adv.daily': 'Daily fixed expenses', 'adv.mins': 'Installments & minimums', 'adv.livingB': 'Living budget',
  'dont.cash': 'Don’t take a cash advance on a credit card — fees and profit from day one.',
  'dont.bnpl': 'Don’t use Tabby or Tamara to cover the gap — it just moves the problem to next month.',
  'dont.min': 'Don’t miss the card minimum — late fees and a SIMAH record.',
  'dont.loan': 'Don’t borrow again unless it’s essential and the repayment date is clear.',
  'step.pauseSub': 'Pause or cancel {label}', 'step.trimDaily': 'Cut {label} in half', 'step.stopDaily': 'Stop {label} until payday ({a} days)',
  'step.cutLiving': 'Lower daily spending from {a} to {b}', 'step.cardMin': 'Pay only the {a} minimum this time', 'step.cardMinSub': 'Costs about {b} in profit next month',
  'step.askDelay': 'Ask {label} to delay the payment', 'step.dropImportant': 'See if {label} can wait', 'step.useEmergency': 'Last resort: use the emergency fund',
  'pri.essential': 'Essential', 'pri.important': 'Important', 'pri.optional': 'Can drop', 'com.priority': 'Importance when money is short',
  'com.daily': 'Daily', 'com.weekdays': 'Days', 'com.everyDay': 'Every day', 'com.auto': 'Log automatically', 'com.autoHint': 'Added by itself every day. If you skip a day, delete it from Activity.',
  'com.perDay': 'per day', 'com.monthlyEq': '≈ {v} a month', 'com.dailyHint': 'Something you buy almost every day (cigarettes, coffee, transport…)',
  'home.perDay': 'That’s {v} a day for the {n} days left', 'home.capped': 'Your budget is {v}, but cash left after bills doesn’t cover it. See suggestions.', 'home.tips': 'Suggestions', 'home.untilPay': 'Until payday', 'home.autoLogged': 'Logged automatically today: {label}', 'home.undoAuto': 'Didn’t buy today',
  'set.title': 'Settings', 'set.lang': 'Language', 'set.langNote': 'The whole app flips with the language: direction, order and arrows. Numbers stay Western in both.',
  'set.income': 'Income', 'set.salary': 'Monthly salary', 'set.payday': 'Payday', 'set.paydaySub': 'Your money cycle starts on this day', 'set.salaryAcc': 'Paid into',
  'set.bonus': 'Bonus', 'set.bonusOn': 'I get a bonus', 'set.bonusEvery': 'Every N months', 'set.bonusNext': 'Next bonus', 'set.bonusAmount': 'Expected amount',
  'set.bonusSplit': 'Bonus split (debts / savings %)', 'set.plan': 'Plan', 'set.living': 'Living budget', 'set.saveMonthly': 'Monthly savings', 'set.emergencyTarget': 'Emergency fund goal',
  'set.emergencyAcc': 'Emergency account', 'set.manage': 'Customize', 'set.subsCard': 'Subscriptions card', 'set.security': 'Security', 'set.bio': 'Unlock with Face ID',
  'set.bioSub': 'Instead of typing the password every time', 'set.bioNA': 'Not supported on this device', 'set.changePass': 'Change password', 'set.lockNow': 'Lock now', 'set.hide': 'Hide amounts',
  'set.data': 'Your data & backups', 'set.dataNote': 'Your data stays on your phone, encrypted. It never goes to GitHub or any server.',
  'set.backupNow': 'Back up now', 'set.backupSub': 'Encrypted file you can save to iCloud or Files', 'set.restore': 'Restore backup', 'set.csv': 'Export transactions (CSV)',
  'set.lastBackup': 'Last backup: {d}', 'set.never': 'No backup yet', 'set.drive': 'Google Drive', 'set.driveSub': 'Encrypted copies in a private app folder',
  'set.driveClient': 'Google Client ID', 'set.driveConnect': 'Connect & back up', 'set.driveRestore': 'Restore latest from Drive', 'set.driveNeed': 'Add a Client ID first (see README)',
  'set.driveDone': 'Backup uploaded to Drive', 'set.driveLast': 'Last Drive backup: {d}', 'set.wipe': 'Delete all data', 'set.wipeConfirm': 'Everything will be permanently deleted. Sure?',
  'set.restorePass': 'Backup password', 'set.restored': 'Your data is back', 'set.restoreFail': 'Couldn’t open the backup — check the password',
  'set.oldPass': 'Current password', 'set.newPass': 'New password', 'set.passChanged': 'Password changed', 'set.remind': 'Remind before due (days)', 'set.name': 'Your name',
  'set.version': 'Version', 'set.installHint': 'To install: in Safari tap Share, then “Add to Home Screen”'
};

const dicts: Record<Lang, Record<Key, string>> = { ar, en };

let lang: Lang = 'ar';

export function setLang(l: Lang): void {
  lang = l;
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
}

export function getLang(): Lang {
  return lang;
}

export function isRTL(): boolean {
  return lang === 'ar';
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthsEnShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const daysArShort = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const daysEnShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function monthName(m0: number, short = false): string {
  if (lang === 'ar') return short ? monthsAr[m0].slice(0, 3) : monthsAr[m0];
  return short ? monthsEnShort[m0] : monthsEn[m0];
}

export function dayName(d0: number, short = false): string {
  if (lang === 'ar') return short ? daysArShort[d0] : daysAr[d0];
  return short ? daysEnShort[d0] : daysEn[d0];
}

/** "3 أكتوبر" / "Oct 3" */
export function fmtDay(iso: string, withWeekday = false, withYear = false): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  const yr = withYear ? ' ' + y : '';
  if (lang === 'ar') return (withWeekday ? daysAr[wd] + ' ' : '') + d + ' ' + monthsAr[m - 1] + yr;
  return (withWeekday ? daysEn[wd] + ', ' : '') + monthsEnShort[m - 1] + ' ' + d + (withYear ? ', ' + y : '');
}

export function fmtMonth(y: number, m0: number): string {
  return monthName(m0) + ' ' + y;
}

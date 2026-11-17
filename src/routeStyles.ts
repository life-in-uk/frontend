// Stylesheets of the pages in routeChunks.ts, imported here in the order the
// app reached them before route-level code splitting (when App imported every
// page directly). The build emits one stylesheet (cssCodeSplit: false), so
// this keeps the cascade exactly as it was; the pages still import their own.
import "./components/health/Health.css";
import "./components/guides/Guide.css";
import "./components/family-visa/checklist/FamilyVisaChecklist.css";
import "./components/family-visa/navigator/FamilyVisaNavigator.css";
import "./components/settlement/Settlement.css";
import "./components/family-visa/FamilyVisa.css";
import "./components/family-visa/topics/FamilyVisaTopic.css";
import "./components/money/Money.css";
import "./components/work-visa/WorkVisa.css";
import "./components/renting/Renting.css";
import "./components/travel/Travel.css";

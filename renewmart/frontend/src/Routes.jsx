import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import ProjectManagement from './pages/project-management';
import Registration from './pages/registration';
import LoginPage from './pages/login';
import Marketplace from './pages/Marketplace';
import Dashboard from './pages/dashboard';
import DocumentManagement from './pages/document-management';
import ProtectedRoute, { 
  PublicRoute, 
  OwnerRoute, 
  ReviewerRoute, 
  AdminRoute, 
  InvestorRoute,
  ProjectManagerRoute,
  SalesAdvisorRoute,
  AnalystRoute,
  GovernanceLeadRoute
} from './components/ProtectedRoute';
import RoleBasedRedirect from './components/RoleBasedRedirect';

// Import new pages from landinvest_pro
import AdminDashboard from './pages/admin-dashboard';
import AdminMarketplace from './pages/admin-marketplace';
import MarketplaceV2 from './pages/admin-marketplace/MarketplaceV2';
import MyPublishedProjects from './pages/admin-marketplace/MyPublishedProjects';
import AdminInvestorInterests from './pages/admin-investor-interests';
import ProjectReviewersPage from './pages/admin-dashboard/project-reviewers';
import InvestorPortal from './pages/investor-portal';
import InvestorDashboardPage from './pages/investor-dashboard';
import MyInterests from './pages/investor-portal/MyInterests';
import LandDetailsPage from './pages/investor-portal/LandDetailsPage';
import BrowseProperties from './pages/investor/BrowseProperties';
import DocumentReview from './pages/document-review';
import AdminDocumentReview from './pages/document-review/AdminDocumentReview';
import DocumentUpload from './pages/document-upload';
import DocumentVersionUpload from './pages/document-version-upload';
import LandownerDashboard from './pages/landowner-dashboard';
import LandownerProjectStatus from './pages/landowner-project-status';
import ProjectReviewPage from './pages/landowner-project-status/components/ProjectReviewPage';
import Account from './pages/account';
import LandownerProjectReview from './pages/landowner-project-status/components/LandownerProjectReview';
import ReviewerDashboard from './pages/reviewer-dashboard';
import ReviewerProjects from './pages/reviewer-projects';
import ProjectDetails from './pages/reviewer-dashboard/ProjectDetails';
import ProjectDetailsPage from './pages/project-details';
import InvestorInterestsPage from './pages/sales-advisor/InvestorInterestsPage';
import Register from './pages/register';
import Unauthorized from './pages/Unauthorized';
import DocumentVersionsDebug from './pages/DocumentVersionsDebug';
import AdminDocumentVersions from './pages/admin/AdminDocumentVersions';
import DocumentVersionsPage from './pages/DocumentVersionsPage';
import RouteTest from './components/RouteTest';
import AdminProjectDocuments from './pages/admin-dashboard/components/AdminProjectDocuments';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        {/* Public routes */}
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/registration" element={
          <PublicRoute>
            <Registration />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        
        {/* Root redirect */}
        <Route path="/" element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        } />
        
        {/* ========================================== */}
        {/* ADMIN ROUTES - /admin/* */}
        {/* ========================================== */}
        <Route path="/admin/dashboard" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
        <Route path="/admin/document-versions/:landId" element={
          <AdminRoute>
            <AdminDocumentVersions />
          </AdminRoute>
        } />
        <Route path="/admin/projects/:projectId/documents" element={
          <AdminRoute>
            <AdminProjectDocuments />
          </AdminRoute>
        } />
        <Route path="/admin/marketplace" element={
          <AdminRoute>
            <MarketplaceV2 />
          </AdminRoute>
        } />
        <Route path="/admin/marketplace/my-projects" element={
          <AdminRoute>
            <MyPublishedProjects />
          </AdminRoute>
        } />
        <Route path="/admin/investor-interests" element={
          <AdminRoute>
            <AdminInvestorInterests />
          </AdminRoute>
        } />
        <Route path="/admin/document-review" element={
          <AdminRoute>
            <AdminDocumentReview />
          </AdminRoute>
        } />
        <Route path="/admin/project-details/:landId" element={
          <AdminRoute>
            <ProjectDetailsPage />
          </AdminRoute>
        } />
        <Route path="/admin/projects/:projectId/reviewers" element={
          <AdminRoute>
            <ProjectReviewersPage />
          </AdminRoute>
        } />
        
        {/* ========================================== */}
        {/* LANDOWNER ROUTES - /landowner/* */}
        {/* ========================================== */}
        <Route path="/landowner/dashboard" element={
          <OwnerRoute>
            <LandownerDashboard />
          </OwnerRoute>
        } />
        <Route path="/landowner/project-status" element={
          <OwnerRoute>
            <LandownerProjectStatus />
          </OwnerRoute>
        } />
        <Route path="/landowner/document-upload" element={
          <OwnerRoute>
            <DocumentUpload />
          </OwnerRoute>
        } />
        <Route path="/landowner/project-management" element={
          <OwnerRoute>
            <ProjectManagement />
          </OwnerRoute>
        } />
        <Route path="/landowner/marketplace" element={
          <OwnerRoute>
            <Marketplace />
          </OwnerRoute>
        } />
        <Route path="/landowner/project-details/:landId" element={
          <OwnerRoute>
            <ProjectDetailsPage />
          </OwnerRoute>
        } />
        <Route path="/landowner/project-review/:projectId" element={
          <OwnerRoute>
            <LandownerProjectReview />
          </OwnerRoute>
        } />
        <Route path="/landowner/document-versions/:landId" element={
          <OwnerRoute>
            <DocumentVersionsPage />
          </OwnerRoute>
        } />
        
        {/* ========================================== */}
        {/* REVIEWER ROUTES - /reviewer/* */}
        {/* ========================================== */}
        <Route path="/reviewer/dashboard" element={
          <ReviewerRoute>
            <ReviewerDashboard />
          </ReviewerRoute>
        } />
        <Route path="/reviewer/projects" element={
          <ReviewerRoute>
            <ReviewerProjects />
          </ReviewerRoute>
        } />
        <Route path="/reviewer/dashboard/project/:landId" element={
          <ReviewerRoute>
            <ProjectDetails />
          </ReviewerRoute>
        } />
        <Route path="/reviewer/project/:landId" element={
          <ReviewerRoute>
            <ProjectDetails />
          </ReviewerRoute>
        } />
        <Route path="/reviewer/document-versions/:landId" element={
          <ReviewerRoute>
            <DocumentVersionsPage />
          </ReviewerRoute>
        } />
        <Route path="/reviewer/document-management" element={
          <ReviewerRoute>
            <DocumentManagement />
          </ReviewerRoute>
        } />
        <Route path="/reviewer/marketplace" element={
          <ReviewerRoute>
            <Marketplace />
          </ReviewerRoute>
        } />
        <Route path="/reviewer/project-details/:landId" element={
          <ReviewerRoute>
            <ProjectDetailsPage />
          </ReviewerRoute>
        } />
        
        {/* ========================================== */}
        {/* INVESTOR ROUTES - /investor/* */}
        {/* ========================================== */}
        <Route path="/investor/dashboard" element={
          <InvestorRoute>
            <InvestorDashboardPage />
          </InvestorRoute>
        } />
        <Route path="/investor/portal" element={
          <InvestorRoute>
            <InvestorPortal />
          </InvestorRoute>
        } />
        <Route path="/investor/browse-properties" element={
          <InvestorRoute>
            <BrowseProperties />
          </InvestorRoute>
        } />
        <Route path="/investor/marketplace" element={
          <InvestorRoute>
            <Marketplace />
          </InvestorRoute>
        } />
        <Route path="/investor/project-details/:landId" element={
          <InvestorRoute>
            <ProjectDetailsPage />
          </InvestorRoute>
        } />
        <Route path="/investor/land-details/:landId" element={
          <InvestorRoute>
            <LandDetailsPage />
          </InvestorRoute>
        } />
        <Route path="/investor/my-interests" element={
          <InvestorRoute>
            <MyInterests />
          </InvestorRoute>
        } />
        
        {/* ========================================== */}
        {/* SALES ADVISOR ROUTES - /sales-advisor/* */}
        {/* ========================================== */}
        <Route path="/sales-advisor/dashboard" element={
          <SalesAdvisorRoute>
            <ReviewerDashboard />
          </SalesAdvisorRoute>
        } />
        <Route path="/sales-advisor/project/:landId" element={
          <SalesAdvisorRoute>
            <ProjectDetails />
          </SalesAdvisorRoute>
        } />
        <Route path="/sales-advisor/document-review/:projectId" element={
          <SalesAdvisorRoute>
            <DocumentReview />
          </SalesAdvisorRoute>
        } />
        <Route path="/sales-advisor/document-management" element={
          <SalesAdvisorRoute>
            <DocumentManagement />
          </SalesAdvisorRoute>
        } />
        <Route path="/sales-advisor/marketplace" element={
          <SalesAdvisorRoute>
            <Marketplace />
          </SalesAdvisorRoute>
        } />
        <Route path="/sales-advisor/project-details/:landId" element={
          <SalesAdvisorRoute>
            <ProjectDetailsPage />
          </SalesAdvisorRoute>
        } />
        <Route path="/sales-advisor/investor-interests" element={
          <SalesAdvisorRoute>
            <InvestorInterestsPage />
          </SalesAdvisorRoute>
        } />
        
        {/* ========================================== */}
        {/* ANALYST ROUTES - /analyst/* */}
        {/* ========================================== */}
        <Route path="/analyst/dashboard" element={
          <AnalystRoute>
            <ReviewerDashboard />
          </AnalystRoute>
        } />
        <Route path="/analyst/project/:landId" element={
          <AnalystRoute>
            <ProjectDetails />
          </AnalystRoute>
        } />
        <Route path="/analyst/document-review/:projectId" element={
          <AnalystRoute>
            <DocumentReview />
          </AnalystRoute>
        } />
        <Route path="/analyst/document-management" element={
          <AnalystRoute>
            <DocumentManagement />
          </AnalystRoute>
        } />
        <Route path="/analyst/marketplace" element={
          <AnalystRoute>
            <Marketplace />
          </AnalystRoute>
        } />
        <Route path="/analyst/project-details/:landId" element={
          <AnalystRoute>
            <ProjectDetailsPage />
          </AnalystRoute>
        } />
        
        {/* ========================================== */}
        {/* GOVERNANCE LEAD ROUTES - /governance/* */}
        {/* ========================================== */}
        <Route path="/governance/dashboard" element={
          <GovernanceLeadRoute>
            <ReviewerDashboard />
          </GovernanceLeadRoute>
        } />
        <Route path="/governance/project/:landId" element={
          <GovernanceLeadRoute>
            <ProjectDetails />
          </GovernanceLeadRoute>
        } />
        <Route path="/governance/document-review/:projectId" element={
          <GovernanceLeadRoute>
            <DocumentReview />
          </GovernanceLeadRoute>
        } />
        <Route path="/governance/document-management" element={
          <GovernanceLeadRoute>
            <DocumentManagement />
          </GovernanceLeadRoute>
        } />
        <Route path="/governance/marketplace" element={
          <GovernanceLeadRoute>
            <Marketplace />
          </GovernanceLeadRoute>
        } />
        <Route path="/governance/project-details/:landId" element={
          <GovernanceLeadRoute>
            <ProjectDetailsPage />
          </GovernanceLeadRoute>
        } />
        
        {/* ========================================== */}
        {/* PROJECT MANAGER ROUTES - /project-manager/* */}
        {/* ========================================== */}
        <Route path="/project-manager/dashboard" element={
          <ProjectManagerRoute>
            <AdminDashboard />
          </ProjectManagerRoute>
        } />
        <Route path="/project-manager/marketplace" element={
          <ProjectManagerRoute>
            <MarketplaceV2 />
          </ProjectManagerRoute>
        } />
        <Route path="/project-manager/investor-interests" element={
          <ProjectManagerRoute>
            <AdminInvestorInterests />
          </ProjectManagerRoute>
        } />
        <Route path="/project-manager/document-review/:projectId" element={
          <ProjectManagerRoute>
            <AdminDocumentReview />
          </ProjectManagerRoute>
        } />
        <Route path="/project-manager/project-details/:landId" element={
          <ProjectManagerRoute>
            <ProjectDetailsPage />
          </ProjectManagerRoute>
        } />
        
        {/* ========================================== */}
        {/* GENERAL PROTECTED ROUTES */}
        {/* ========================================== */}
        <Route path="/marketplace" element={
          <ProtectedRoute>
            <Marketplace />
          </ProtectedRoute>
        } />
        <Route path="/project-details/:landId" element={
          <ProtectedRoute>
            <ProjectDetailsPage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        } />
        
        {/* Account Page - Available to all authenticated users */}
        <Route path="/account" element={
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        } />
        
        {/* ========================================== */}
        {/* LEGACY ROUTES - For backward compatibility */}
        {/* ========================================== */}
        <Route path="/admin-dashboard" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
        <Route path="/admin-marketplace" element={
          <AdminRoute>
            <MarketplaceV2 />
          </AdminRoute>
        } />
        <Route path="/admin-investor-interests" element={
          <AdminRoute>
            <AdminInvestorInterests />
          </AdminRoute>
        } />
        <Route path="/admin-document-review" element={
          <AdminRoute>
            <AdminDocumentReview />
          </AdminRoute>
        } />
        <Route path="/investor-portal" element={
          <InvestorRoute>
            <InvestorPortal />
          </InvestorRoute>
        } />
        <Route path="/browse-properties" element={
          <InvestorRoute>
            <BrowseProperties />
          </InvestorRoute>
        } />
        <Route path="/document-upload" element={
          <OwnerRoute>
            <DocumentUpload />
          </OwnerRoute>
        } />
        <Route path="/document-version-upload" element={
          <OwnerRoute>
            <DocumentVersionUpload />
          </OwnerRoute>
        } />
        <Route path="/document-review/:projectId" element={
          <ReviewerRoute>
            <DocumentReview />
          </ReviewerRoute>
        } />
        <Route path="/landowner-dashboard" element={
          <OwnerRoute>
            <LandownerDashboard />
          </OwnerRoute>
        } />
        <Route path="/landowner-project-status" element={
          <OwnerRoute>
            <LandownerProjectStatus />
          </OwnerRoute>
        } />
        <Route path="/reviewer-dashboard" element={
          <ReviewerRoute>
            <ReviewerDashboard />
          </ReviewerRoute>
        } />
        <Route path="/reviewer-dashboard/project/:landId" element={
          <ReviewerRoute>
            <ProjectDetails />
          </ReviewerRoute>
        } />
        <Route path="/project-management" element={
          <OwnerRoute>
            <ProjectManagement />
          </OwnerRoute>
        } />
        <Route path="/document-management" element={
          <ReviewerRoute>
            <DocumentManagement />
          </ReviewerRoute>
        } />
        <Route path="/sales-advisor-dashboard" element={
          <SalesAdvisorRoute>
            <ReviewerDashboard />
          </SalesAdvisorRoute>
        } />
        <Route path="/analyst-dashboard" element={
          <AnalystRoute>
            <ReviewerDashboard />
          </AnalystRoute>
        } />
        <Route path="/governance-dashboard" element={
          <GovernanceLeadRoute>
            <ReviewerDashboard />
          </GovernanceLeadRoute>
        } />
        <Route path="/project-manager-dashboard" element={
          <ProjectManagerRoute>
            <AdminDashboard />
          </ProjectManagerRoute>
        } />
        
        {/* ========================================== */}
        {/* DEBUG ROUTES */}
        {/* ========================================== */}
        <Route path="/debug/document-versions" element={
          <DocumentVersionsDebug />
        } />
        <Route path="/test/routes" element={
          <ProtectedRoute>
            <RouteTest />
          </ProtectedRoute>
        } />
        
        {/* ========================================== */}
        {/* ERROR ROUTES */}
        {/* ========================================== */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;

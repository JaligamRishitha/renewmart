import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import StatusBadge from "./StatusBadge";
import { landsAPI } from "../../../services/api";

const ProjectTable = ({ projects, onProjectSelect, onPublishProject }) => {
  const [sortField, setSortField] = useState("submittedDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [publishing, setPublishing] = useState({});
  const navigate = useNavigate();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedProjects = [...projects]?.sort((a, b) => {
    let aValue = a?.[sortField];
    let bValue = b?.[sortField];

    // Handle date fields
    if (sortField === "submittedDate" || sortField === "created_at" || sortField === "project_due_date") {
      // Fallback to created_at if submittedDate is not available
      if (sortField === "submittedDate") {
        aValue = a?.submittedDate || a?.created_at;
        bValue = b?.submittedDate || b?.created_at;
      }
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString)?.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getProjectIcon = (projectType) => {
    const iconMap = {
      Solar: "Sun",
      Wind: "Wind",
      Hydroelectric: "Waves",
      Biomass: "Leaf",
      Geothermal: "Flame",
    };
    return iconMap[projectType] || "MapPin";
  };

  const handleProjectClick = (project) => {
    // Navigate to reviewer assignment page
    navigate(`/admin/projects/${project.id}/reviewers`);
  };

  const handleAction = async (action, project) => {
    switch (action) {
      case "publish":
        try {
          setPublishing((prev) => ({ ...prev, [project.id]: true }));
          await landsAPI.publishLand(project.id);
          if (onPublishProject) {
            onPublishProject(project);
          }
          // Show success message or refresh data
          console.log("Project published successfully");
        } catch (error) {
          console.error("Error publishing project:", error);
          alert(
            `Failed to publish project: ${
              error.response?.data?.detail || error.message
            }`
          );
        } finally {
          setPublishing((prev) => ({ ...prev, [project.id]: false }));
        }
        break;
      default:
        break;
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return (
        <Icon name="ArrowUpDown" size={14} className="text-muted-foreground" />
      );
    return (
      <Icon
        name={sortDirection === "asc" ? "ArrowUp" : "ArrowDown"}
        size={14}
        className="text-foreground"
      />
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-elevation-1 overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th
                className="text-left px-6 py-3 font-body font-medium text-sm text-foreground cursor-pointer hover:bg-muted/70 transition-smooth"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center space-x-2">
                  <span>Project Name</span>
                  <SortIcon field="title" />
                </div>
              </th>
              <th
                className="text-left px-6 py-3 font-body font-medium text-sm text-foreground cursor-pointer hover:bg-muted/70 transition-smooth"
                onClick={() => handleSort("landownerName")}
              >
                <div className="flex items-center space-x-2">
                  <span>Landowner</span>
                  <SortIcon field="landownerName" />
                </div>
              </th>
              <th
                className="text-left px-6 py-3 font-body font-medium text-sm text-foreground cursor-pointer hover:bg-muted/70 transition-smooth"
                onClick={() => handleSort("energy_key")}
              >
                <div className="flex items-center space-x-2">
                  <span>Project Type</span>
                  <SortIcon field="energy_key" />
                </div>
              </th>
              <th
                className="text-left px-6 py-3 font-body font-medium text-sm text-foreground cursor-pointer hover:bg-muted/70 transition-smooth"
                onClick={() => handleSort("submittedDate")}
              >
                <div className="flex items-center space-x-2">
                  <span>Start Date</span>
                  <SortIcon field="submittedDate" />
                </div>
              </th>
              <th
                className="text-left px-6 py-3 font-body font-medium text-sm text-foreground cursor-pointer hover:bg-muted/70 transition-smooth"
                onClick={() => handleSort("project_due_date")}
              >
                <div className="flex items-center space-x-2">
                  <span>End Date</span>
                  <SortIcon field="project_due_date" />
                </div>
              </th>
              <th className="text-left px-6 py-3 font-body font-medium text-sm text-foreground">
                Status
              </th>
              <th className="text-center px-6 py-3 font-body font-medium text-sm text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedProjects?.map((project) => (
              <tr
                key={project?.id}
                className="hover:bg-muted/30 transition-smooth cursor-pointer"
                onClick={() => handleProjectClick(project)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon
                        name={getProjectIcon(project?.energy_key)}
                        size={18}
                        className="text-primary"
                      />
                    </div>
                    <div>
                      <div className="font-body font-medium text-sm text-foreground">
                        {project?.title}
                      </div>
                      <div className="font-body text-xs text-muted-foreground">
                        {project?.location_text}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Icon name="User" size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-body font-medium text-sm text-foreground">
                        {project?.landownerName}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        {project?.landownerEmail}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Icon
                      name={getProjectIcon(
                        project?.energy_key || project?.energyType
                      )}
                      size={16}
                      className="text-primary"
                    />
                    <span className="font-body text-sm text-foreground capitalize">
                      {project?.energy_key ||
                        project?.energyType ||
                        "Not specified"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-body text-sm text-foreground">
                    {formatDate(project?.submittedDate || project?.created_at)}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-body text-sm text-foreground">
                    {formatDate(project?.project_due_date)}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={project?.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/projects/${project.id}/documents`);
                      }}
                      iconName="FileText"
                      iconSize={16}
                      title="View Documents"
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProjectClick(project);
                      }}
                      iconName="Users"
                      iconSize={16}
                      title="Assign Reviewers"
                    />
                    {project?.status === "approved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction("publish", project);
                        }}
                        iconName="Globe"
                        iconSize={16}
                        title="Publish to Marketplace"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        loading={publishing[project.id]}
                        disabled={publishing[project.id]}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-border">
        {sortedProjects?.map((project) => (
          <div
            key={project?.id}
            className="p-4 hover:bg-muted/30 transition-smooth cursor-pointer"
            onClick={() => handleProjectClick(project)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon
                    name={getProjectIcon(project?.energy_key)}
                    size={18}
                    className="text-primary"
                  />
                </div>
                <div>
                  <p className="font-body font-bold text-sm text-foreground">
                    {project?.title}
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    {project?.landownerName}
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    {project?.location_text}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <StatusBadge status={project?.status} size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">
                  Project Type
                </p>
                <div className="flex items-center space-x-2">
                  <Icon
                    name={getProjectIcon(
                      project?.energy_key || project?.energyType
                    )}
                    size={14}
                    className="text-primary"
                  />
                  <span className="font-body text-sm text-foreground capitalize">
                    {project?.energy_key ||
                      project?.energyType ||
                      "Not specified"}
                  </span>
                </div>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">
                  Start Date
                </p>
                <p className="font-body text-sm text-foreground">
                  {formatDate(project?.submittedDate || project?.created_at)}
                </p>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">
                  End Date
                </p>
                <p className="font-body text-sm text-foreground">
                  {formatDate(project?.project_due_date)}
                </p>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">
                  Capacity
                </p>
                <p className="font-body text-sm text-foreground">
                  {project?.capacity_mw} MW
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-body text-xs text-muted-foreground">
                Click to assign reviewers
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/projects/${project.id}/documents`);
                  }}
                  iconName="FileText"
                  iconSize={16}
                  title="View Documents"
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectClick(project);
                  }}
                  iconName="Users"
                  iconSize={16}
                  title="Assign Reviewers"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectTable;
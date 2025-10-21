import React, { useState } from 'react';
import Icon from '../../components/AppIcon';

const ReviewPanelCompact = ({ reviewerRole, taskId, onSave }) => {
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [checklist, setChecklist] = useState({});

  const reviewCriteria = {
    're_sales_advisor': [
      'Market viability assessment complete',
      'Location accessibility verified',
      'Revenue projections reviewed',
      'Competition analysis done',
      'ROI calculations verified'
    ],
    're_analyst': [
      'Technical specifications reviewed',
      'Topographical survey analyzed',
      'Grid connectivity feasibility assessed',
      'Financial model validated',
      'Cost estimations verified'
    ],
    're_governance_lead': [
      'Legal documentation verified',
      'Zoning approvals checked',
      'Environmental clearances reviewed',
      'Government NOC validated',
      'Regulatory compliance confirmed'
    ]
  };

  const criteria = reviewCriteria[reviewerRole] || reviewCriteria['re_analyst'];

  const handleChecklistChange = (index, checked) => {
    setChecklist(prev => ({ ...prev, [index]: checked }));
  };

  const completionPercentage = Math.round(
    (Object.values(checklist).filter(Boolean).length / criteria.length) * 100
  );

  const handleSave = () => {
    const reviewData = {
      taskId,
      rating,
      comments,
      checklist,
      completionPercentage,
      timestamp: new Date().toISOString()
    };
    
    console.log('Saving review:', reviewData);
    onSave(reviewData);
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Review Progress</span>
          <span className="text-2xl font-bold text-primary">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon name="CheckSquare" size={18} className="text-primary" />
          Review Checklist
        </h3>
        <div className="space-y-2">
          {criteria.map((item, index) => (
            <label
              key={index}
              className="flex items-center gap-3 p-2 hover:bg-background rounded cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={checklist[index] || false}
                onChange={(e) => handleChecklistChange(index, e.target.checked)}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
              />
              <span className={`text-sm ${
                checklist[index] ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}>
                {item}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon name="Star" size={18} className="text-primary" />
          Overall Rating
        </h3>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Icon
                name="Star"
                size={32}
                className={`${
                  star <= rating
                    ? 'text-yellow-500 fill-current'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon name="MessageSquare" size={18} className="text-primary" />
          Review Comments
        </h3>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Add your detailed review comments here..."
          rows={6}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="Save" size={18} />
          Save Review
        </button>
      </div>
    </div>
  );
};

export default ReviewPanelCompact;


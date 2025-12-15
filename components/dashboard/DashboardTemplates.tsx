'use client';

import { useState } from 'react';
import Card from '../ui/Card';

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'sales' | 'marketing' | 'financial' | 'ecommerce' | 'hr' | 'general';
  charts: {
    type: 'bar' | 'line' | 'area' | 'pie';
    title: string;
    columns: string[];
  }[];
  filters: any[];
  insights: string[];
}

const TEMPLATES: DashboardTemplate[] = [
  {
    id: 'sales-overview',
    name: 'Sales Performance Dashboard',
    description: 'Track revenue, units sold, and sales trends across regions and products',
    icon: '💰',
    color: 'from-green-50 to-green-100',
    category: 'sales',
    charts: [
      { type: 'line', title: 'Revenue Trend Over Time', columns: ['Date', 'Sales'] },
      { type: 'bar', title: 'Sales by Region', columns: ['Region', 'Sales'] },
      { type: 'pie', title: 'Product Category Mix', columns: ['Category', 'Units'] },
      { type: 'area', title: 'Cumulative Revenue', columns: ['Date', 'Sales'] },
    ],
    filters: [],
    insights: ['Revenue trends', 'Top performing regions', 'Product mix analysis'],
  },
  {
    id: 'marketing-roi',
    name: 'Marketing ROI Dashboard',
    description: 'Analyze campaign performance, conversion rates, and return on ad spend',
    icon: '📊',
    color: 'from-purple-50 to-purple-100',
    category: 'marketing',
    charts: [
      { type: 'bar', title: 'Campaign Performance', columns: ['Campaign', 'Revenue'] },
      { type: 'line', title: 'Conversion Rate Trend', columns: ['Date', 'Conversions'] },
      { type: 'pie', title: 'Channel Distribution', columns: ['Channel', 'Cost'] },
      { type: 'area', title: 'ROAS Over Time', columns: ['Date', 'ROI'] },
    ],
    filters: [],
    insights: ['Top campaigns', 'Channel efficiency', 'ROI trends'],
  },
  {
    id: 'financial-tracking',
    name: 'Financial Health Dashboard',
    description: 'Monitor cash flow, expenses, income, and account balances',
    icon: '💳',
    color: 'from-blue-50 to-blue-100',
    category: 'financial',
    charts: [
      { type: 'area', title: 'Account Balance Over Time', columns: ['Date', 'Balance'] },
      { type: 'bar', title: 'Income vs Expenses', columns: ['Category', 'Debit', 'Credit'] },
      { type: 'pie', title: 'Expense Breakdown', columns: ['Category', 'Debit'] },
      { type: 'line', title: 'Monthly Cash Flow', columns: ['Date', 'Balance'] },
    ],
    filters: [],
    insights: ['Spending patterns', 'Savings trends', 'Budget analysis'],
  },
  {
    id: 'ecommerce-analytics',
    name: 'E-commerce Analytics',
    description: 'Track orders, revenue, customer behavior, and product performance',
    icon: '🛒',
    color: 'from-orange-50 to-orange-100',
    category: 'ecommerce',
    charts: [
      { type: 'line', title: 'Daily Orders', columns: ['Date', 'Quantity'] },
      { type: 'bar', title: 'Revenue by Product', columns: ['Product_Name', 'Price'] },
      { type: 'pie', title: 'Payment Methods', columns: ['Payment_Method', 'Price'] },
      { type: 'area', title: 'Revenue Trend', columns: ['Date', 'Price'] },
    ],
    filters: [],
    insights: ['Best sellers', 'Customer preferences', 'Payment trends'],
  },
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'High-level KPIs and metrics for leadership decision-making',
    icon: '📈',
    color: 'from-rose-50 to-rose-100',
    category: 'general',
    charts: [
      { type: 'bar', title: 'Key Metrics Overview', columns: [] },
      { type: 'line', title: 'Growth Trend', columns: [] },
      { type: 'pie', title: 'Resource Allocation', columns: [] },
      { type: 'area', title: 'Performance Over Time', columns: [] },
    ],
    filters: [],
    insights: ['Growth rates', 'Key performance indicators', 'Strategic insights'],
  },
  {
    id: 'customer-insights',
    name: 'Customer Analytics',
    description: 'Understand customer behavior, segments, and lifetime value',
    icon: '👥',
    color: 'from-teal-50 to-teal-100',
    category: 'general',
    charts: [
      { type: 'bar', title: 'Customer Segments', columns: [] },
      { type: 'line', title: 'Customer Acquisition', columns: [] },
      { type: 'pie', title: 'Customer Type Distribution', columns: [] },
      { type: 'area', title: 'Lifetime Value Trend', columns: [] },
    ],
    filters: [],
    insights: ['Customer segments', 'Acquisition trends', 'Retention rates'],
  },
];

interface DashboardTemplatesProps {
  columns: string[];
  onApplyTemplate: (template: DashboardTemplate) => void;
}

export default function DashboardTemplates({ columns, onApplyTemplate }: DashboardTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);

  const categories = [
    { id: 'all', name: 'All Templates', icon: '🎯' },
    { id: 'sales', name: 'Sales', icon: '💰' },
    { id: 'marketing', name: 'Marketing', icon: '📊' },
    { id: 'financial', name: 'Financial', icon: '💳' },
    { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
    { id: 'general', name: 'General', icon: '📈' },
  ];

  const filteredTemplates = selectedCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleTemplateClick = (template: DashboardTemplate) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate);
      setShowModal(false);
    }
  };

  return (
    <>
      <Card className="mb-6 shadow-medium">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-display font-bold text-neutral-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
              </svg>
              Dashboard Templates
            </h3>
            <p className="text-sm text-neutral-600 mt-1">
              Start with pre-built dashboards for common use cases
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-blue-500 text-white shadow-medium'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleTemplateClick(template)}
              className={`p-4 bg-gradient-to-br ${template.color} border-2 border-neutral-200 rounded-lg hover:border-blue-400 hover:shadow-medium transition-all cursor-pointer group`}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{template.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-neutral-900 mb-1 group-hover:text-blue-700 transition-colors">
                    {template.name}
                  </h4>
                  <p className="text-xs text-neutral-700 line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>

              {/* Charts Included */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-neutral-900 mb-1">Includes:</p>
                <div className="flex flex-wrap gap-1">
                  {template.charts.slice(0, 3).map((chart, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-0.5 bg-white border border-neutral-300 rounded text-neutral-700"
                    >
                      {chart.type}
                    </span>
                  ))}
                  {template.charts.length > 3 && (
                    <span className="text-xs px-2 py-0.5 bg-white border border-neutral-300 rounded text-neutral-700">
                      +{template.charts.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Insights */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-neutral-900 mb-1">Insights:</p>
                <ul className="text-xs text-neutral-700 space-y-0.5">
                  {template.insights.slice(0, 2).map((insight, idx) => (
                    <li key={idx}>• {insight}</li>
                  ))}
                </ul>
              </div>

              {/* Use Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTemplateClick(template);
                }}
                className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-sm font-semibold flex items-center justify-center gap-2 group-hover:shadow-medium"
              >
                Use Template
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8">
            <p className="text-neutral-600">No templates found in this category.</p>
          </div>
        )}
      </Card>

      {/* Template Preview Modal */}
      {showModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-4xl">{selectedTemplate.icon}</div>
                  <div>
                    <h3 className="text-2xl font-display font-bold text-neutral-900">
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      {selectedTemplate.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Charts Breakdown */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-neutral-900 mb-3">Charts Included</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedTemplate.charts.map((chart, idx) => (
                    <div key={idx} className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 bg-white rounded">
                          {chart.type === 'bar' && '📊'}
                          {chart.type === 'line' && '📈'}
                          {chart.type === 'area' && '📉'}
                          {chart.type === 'pie' && '🥧'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">{chart.title}</p>
                          <p className="text-xs text-neutral-600 capitalize">{chart.type} chart</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-neutral-900 mb-3">Key Insights</h4>
                <ul className="space-y-2">
                  {selectedTemplate.insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700">
                      <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyTemplate}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-semibold"
                >
                  Apply Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

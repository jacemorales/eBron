import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MessageSquare, ShoppingBag, ChevronLeft, Tag, Flag, AlertTriangle, X, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, Trash2, Eye } from 'lucide-react';
import type { Product, ReportCategory, ProductReport } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { maskEmail } from '../utils/mask';

const REPORT_CATEGORIES: ReportCategory[] = [
  'Scammer or fraudulent seller',
  'Fake or counterfeit product',
  'Potentially stolen product',
  'Misleading product description or images',
  'Prohibited or inappropriate item',
  'Suspicious pricing or suspicious activity',
  'Other'
];

export const ProductDetails: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');

  // Report Modal States
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportStep, setReportStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('Scammer or fraudulent seller');
  const [explanation, setExplanation] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Admin Moderation States
  const [productReports, setProductReports] = useState<ProductReport[]>([]);
  const [viewReportsModalOpen, setViewReportsModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getProductById(id).then(p => {
      setProduct(p);
      if (p) setSelectedImage(p.primaryImageUrl || p.images[0] || '');
      setLoading(false);
    });

    if (user?.role === 'admin') {
      api.getProductReports(id).then(setProductReports);
    }
  }, [id, user]);

  const handleAdminRemoveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'admin' || !product) return;
    setRemoving(true);
    const res = await api.removeProductAdmin(product.productId, user.userId, removeReason.trim());
    if (res.success) {
      onToast('success', 'Product has been removed from the public marketplace.');
      setRemoveModalOpen(false);
      navigate('/admin');
    } else {
      onToast('error', res.error || 'Failed to remove product.');
    }
    setRemoving(false);
  };

  const handleChat = async () => {
    if (!user) { navigate('/login?redirect=' + encodeURIComponent(window.location.pathname)); return; }
    if (!product) return;
    if (user.userId === product.sellerId) { onToast('info', 'This is your own listing.'); return; }
    const res = await api.startOrGetConversation(user, product.productId);
    if (res.success && res.conversation) navigate(`/messages?conv=${res.conversation.conversationId}`);
  };

  const handleBuy = () => {
    if (!user) { navigate('/login?redirect=' + encodeURIComponent(window.location.pathname)); return; }
    if (!product) return;
    if (user.userId === product.sellerId) { onToast('error', 'Cannot buy your own product.'); return; }
    navigate(`/checkout/${product.productId}`);
  };

  const handleOpenReport = () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!product) return;
    if (user.userId === product.sellerId) {
      onToast('error', 'You cannot report your own product.');
      return;
    }
    setReportStep(1);
    setSelectedCategory('Scammer or fraudulent seller');
    setExplanation('');
    setReportModalOpen(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;
    if (!explanation.trim()) {
      onToast('error', 'Please provide an explanation for the report.');
      return;
    }

    setSubmittingReport(true);
    const res = await api.reportProduct(user, product.productId, selectedCategory, explanation.trim());
    if (res.success) {
      setReportStep(4); // Success step
      onToast('success', 'Your report has been submitted successfully.');
    } else {
      onToast('error', res.error || 'Failed to submit report.');
    }
    setSubmittingReport(false);
  };

  if (loading || !product) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-cu-blue">
        <ChevronLeft className="w-4 h-4" /> Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-3xl border border-slate-200">
        <div>
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
            <img src={selectedImage} alt={product.name} className="w-full h-full object-contain" />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(img)} className={`w-16 h-16 rounded-xl border-2 overflow-hidden ${selectedImage === img ? 'border-cu-blue' : 'border-slate-200'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs bg-blue-50 text-cu-blue font-bold px-2 py-0.5 rounded">{product.category}</span>
              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">Condition: {product.condition}</span>
              {product.stockNumber && (
                <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-600" /> Stock #{product.stockNumber}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{product.name}</h1>
            <div className="text-2xl font-black text-cu-blue">₦{Number(product.price).toLocaleString()}</div>
            {/* Masked Seller Email for Privacy & Security */}
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
              Seller: <strong>{product.sellerName || 'CU Student'}</strong> ({maskEmail(product.sellerEmail)})
            </div>
            <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{product.description}</div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleChat}
                className="flex-1 py-3 border-2 border-cu-blue text-cu-blue rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-cu-blue hover:text-white transition"
              >
                <MessageSquare className="w-4 h-4" /> Chat with Seller
              </button>
              <button
                type="button"
                onClick={handleBuy}
                disabled={product.availability !== 'available'}
                className="flex-1 py-3 bg-cu-gold hover:bg-cu-goldHover disabled:opacity-50 text-cu-blue rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <ShoppingBag className="w-4 h-4" /> Buy Now
              </button>
            </div>

            {/* Unobtrusive Report Product Link */}
            {(!user || user.userId !== product.sellerId) && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleOpenReport}
                  className="text-[11px] font-semibold text-slate-400 hover:text-red-600 transition inline-flex items-center gap-1"
                >
                  <Flag className="w-3.5 h-3.5" /> Report suspicious or inappropriate listing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Controls Panel (Only visible to authenticated administrators) */}
      {user?.role === 'admin' && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Administrator Moderation Panel</h3>
                <p className="text-[11px] text-slate-600">
                  Direct administrative controls for listing ID: <span className="font-mono font-bold">{product.productId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewReportsModalOpen(true)}
                className="px-3.5 py-2 bg-white border border-amber-300 hover:bg-amber-100/60 text-amber-900 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5 text-amber-700" />
                Reports on Item ({productReports.length})
              </button>
              <button
                type="button"
                onClick={() => setRemoveModalOpen(true)}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin View Reports Modal */}
      {viewReportsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 text-xs border border-slate-200 shadow-2xl animate-in fade-in">
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Reports for "{product.name}" ({productReports.length})
                </h3>
              </div>
              <button type="button" onClick={() => setViewReportsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {productReports.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No reports submitted for this product yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {productReports.map(rep => (
                  <div key={rep.reportId} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-700 text-xs">{rep.category}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${rep.status === 'pending' ? 'bg-amber-100 text-amber-800' : rep.status === 'under_review' ? 'bg-blue-100 text-blue-800' : rep.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {rep.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{rep.explanation}</p>
                    <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t">
                      <span>Reported by: {rep.reporterEmail || 'Student'}</span>
                      <span>{new Date(rep.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setViewReportsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Remove Product Modal */}
      {removeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAdminRemoveProduct} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-xs border border-slate-200 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-extrabold text-sm text-slate-900">Confirm Product Removal</h3>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong>"{product.name}"</strong>? It will immediately become unavailable on the public marketplace, while preserving records for administrative review.
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Reason for Removal (Optional)
              </label>
              <textarea
                rows={3}
                value={removeReason}
                onChange={e => setRemoveReason(e.target.value)}
                placeholder="e.g. Violates university guidelines, verified fraudulent listing, inappropriate content..."
                className="w-full px-3 py-2 border rounded-xl text-xs focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setRemoveModalOpen(false)}
                className="px-3.5 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={removing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" /> {removing ? 'Removing...' : 'Confirm & Remove'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Multi-Step Report Product Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs border border-slate-200 shadow-2xl animate-in fade-in">
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Report Product Listing</h3>
                  <p className="text-[10px] text-slate-500">Reports are confidential and reviewed by CU administrators.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Select Category */}
            {reportStep === 1 && (
              <div className="space-y-3">
                <p className="font-bold text-slate-800 text-xs">
                  What would you like to report this product for?
                </p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {REPORT_CATEGORIES.map(cat => (
                    <label
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${selectedCategory === cat ? 'border-red-500 bg-red-50 text-red-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                    >
                      <span className="text-xs">{cat}</span>
                      <input
                        type="radio"
                        name="reportCategory"
                        checked={selectedCategory === cat}
                        onChange={() => setSelectedCategory(cat)}
                        className="text-red-600 focus:ring-red-500"
                      />
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-3.5 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportStep(2)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1 shadow"
                  >
                    Next: Explain Issue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Explanation */}
            {reportStep === 2 && (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Selected Reason</span>
                  <div className="text-xs font-bold text-red-700 bg-red-50 p-2 rounded-lg mt-0.5 border border-red-100">
                    {selectedCategory}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Please tell us why you are reporting this product. *
                  </label>
                  <textarea
                    rows={4}
                    value={explanation}
                    onChange={e => setExplanation(e.target.value)}
                    placeholder="Provide specific details (e.g. seller asked for cash transfer off-platform, counterfeit markings, suspicious pricing)..."
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Detailed explanations help administrators take swift moderation action.</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setReportStep(1)}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Change Reason
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReportModalOpen(false)}
                      className="px-3.5 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!explanation.trim()}
                      onClick={() => setReportStep(3)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1 shadow"
                    >
                      Review Report <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review and Submit */}
            {reportStep === 3 && (
              <form onSubmit={handleSubmitReport} className="space-y-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Product</span>
                    <div className="font-bold text-slate-900">{product.name} {product.stockNumber ? `(Stock: ${product.stockNumber})` : ''}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                    <div className="font-bold text-red-600">{selectedCategory}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Your Explanation</span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{explanation}</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  By submitting this report, you confirm that the information provided is truthful to the best of your knowledge.
                </p>

                <div className="flex justify-between items-center pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setReportStep(2)}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Edit Details
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReportModalOpen(false)}
                      className="px-3.5 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReport}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1 shadow"
                    >
                      <Flag className="w-3.5 h-3.5" /> {submittingReport ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Step 4: Submission Confirmation */}
            {reportStep === 4 && (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h4 className="font-extrabold text-base text-slate-900">Report Submitted</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Your report has been submitted successfully. Our team will review it.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-5 py-2 bg-cu-blue hover:bg-cu-dark text-white rounded-xl font-bold text-xs shadow"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

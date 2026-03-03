import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

const PaymentCancel = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    // Auto redirect after 8 seconds
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (orderId) {
            navigate(`/orders/${orderId}`);
          } else {
            navigate('/orders');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, orderId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Warning Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <ExclamationCircleIcon className="w-16 h-16 text-yellow-600" />
            </div>
          </div>

          {/* Cancel Message */}
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            Payment Cancelled
          </h1>
          <p className="text-gray-600 mb-8">
            You have cancelled the payment process. Your order is still pending and waiting for payment.
          </p>

          {/* Order Info */}
          {orderId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Order Number</p>
              <p className="text-2xl font-bold text-yellow-700">#{orderId}</p>
              <p className="text-xs text-gray-500 mt-2">Status: Pending Payment</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm flex items-center gap-2">
              <span className="text-blue-600">ℹ️</span>
              Important Information
            </h3>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li className="flex gap-2">
                <span>•</span>
                <span>No amount has been deducted from your account</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Your order is saved and ready for payment</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>You can complete payment anytime from order details</span>
              </li>
            </ul>
          </div>

          {/* Auto Redirect Info */}
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              Redirecting to your order in <span className="font-bold text-yellow-600">{countdown}</span> seconds...
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {orderId && (
              <button
                onClick={() => navigate(`/orders/${orderId}`)}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Complete Payment Now
              </button>
            )}
            <button
              onClick={() => navigate('/orders')}
              className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              View All Orders
            </button>
            <button
              onClick={() => navigate('/services')}
              className="w-full border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Continue Shopping
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Changed your mind? You can always complete the payment later.
            </p>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-6 bg-white rounded-xl shadow-md p-6">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-yellow-600">💭</span>
            Why complete this payment?
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-yellow-600">→</span>
              <span>Your selected services are reserved for you</span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-600">→</span>
              <span>Quick and secure payment process</span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-600">→</span>
              <span>Get your services delivered quickly</span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-600">→</span>
              <span>24/7 customer support available</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;

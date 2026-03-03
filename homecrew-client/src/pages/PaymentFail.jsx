import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/solid';

const PaymentFail = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Auto redirect after 10 seconds
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircleIcon className="w-16 h-16 text-red-600" />
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            Payment Failed
          </h1>
          <p className="text-gray-600 mb-8">
            We couldn't process your payment. Please try again or use a different payment method.
          </p>

          {/* Order Info */}
          {orderId && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Order Number</p>
              <p className="text-2xl font-bold text-red-700">#{orderId}</p>
              <p className="text-xs text-gray-500 mt-2">Your order is still pending payment</p>
            </div>
          )}

          {/* Common Reasons */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">Common reasons for payment failure:</h3>
            <ul className="space-y-1 text-xs text-gray-600">
              <li className="flex gap-2">
                <span>•</span>
                <span>Insufficient balance in your account</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Incorrect card details or OTP</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Payment gateway timeout</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Transaction declined by your bank</span>
              </li>
            </ul>
          </div>

          {/* Auto Redirect Info */}
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              Redirecting to your order in <span className="font-bold text-red-600">{countdown}</span> seconds...
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {orderId && (
              <button
                onClick={() => navigate(`/orders/${orderId}`)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Try Payment Again
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

          {/* Help Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Need help? Contact our support team for assistance.
            </p>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-6 bg-white rounded-xl shadow-md p-6">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-orange-600">💡</span>
            What should you do?
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-orange-600">→</span>
              <span>Check your account balance and card details</span>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-600">→</span>
              <span>Try using a different payment method</span>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-600">→</span>
              <span>Contact your bank if the issue persists</span>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-600">→</span>
              <span>You can retry payment from your order details</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentFail;

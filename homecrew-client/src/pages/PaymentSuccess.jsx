import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Auto redirect after 5 seconds
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircleIcon className="w-16 h-16 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-8">
            Thank you for your payment. Your order has been confirmed and will be processed shortly.
          </p>

          {/* Order Info */}
          {orderId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Order Number</p>
              <p className="text-2xl font-bold text-green-700">#{orderId}</p>
            </div>
          )}

          {/* Auto Redirect Info */}
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              Redirecting to your order in <span className="font-bold text-teal-600">{countdown}</span> seconds...
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => orderId ? navigate(`/orders/${orderId}`) : navigate('/orders')}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              View Order Details
            </button>
            <button
              onClick={() => navigate('/services')}
              className="w-full border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Continue Shopping
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              A confirmation email has been sent to your registered email address.
            </p>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-6 bg-white rounded-xl shadow-md p-6">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-teal-600">ℹ️</span>
            What happens next?
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-teal-600">✓</span>
              <span>Your payment has been processed successfully</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-600">✓</span>
              <span>Service provider will be notified about your order</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-600">✓</span>
              <span>You can track your order status in the Orders section</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

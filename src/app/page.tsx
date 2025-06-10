import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header/Nav */}
      <header className="bg-white shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-indigo-600">Daily Dose Prep</h1>
          </div>
          <div>
            <Link
              href="/login"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 mr-2"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-block bg-white text-indigo-600 border border-indigo-600 px-4 py-2 rounded-md font-medium hover:bg-indigo-50"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              Prepare for your competitive exams
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-500">
              Daily Dose Prep helps you ace your UPSC, JEE, NEET, SSC and other competitive exams with thousands of practice questions.
            </p>
            <div className="mt-10">
              <Link
                href="/register"
                className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-indigo-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h3 className="text-3xl font-bold text-gray-900">Why Choose Daily Dose Prep?</h3>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Comprehensive Question Bank</h4>
                <p className="text-gray-600">Access thousands of MCQs created by expert educators.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Tailored For Exams</h4>
                <p className="text-gray-600">Questions specifically designed for UPSC, JEE, NEET, SSC and more.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Detailed Explanations</h4>
                <p className="text-gray-600">Learn from comprehensive explanations for every question.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>© 2024 Daily Dose Prep. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

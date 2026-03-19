import Link from 'next/link'
import { ArrowRight, Smartphone, Zap, DollarSign, Shield, Users, Mic2, Calendar } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-orange-600">Dare</div>
          <div className="flex gap-4">
            <Link href="/register">
              <button className="px-4 py-2 text-orange-600 hover:text-orange-700 font-medium">
                Sign In
              </button>
            </Link>
            <Link href="/register">
              <button className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-orange-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block mb-4 px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              🎉 Prototype Demo - Grant Application Stage
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Dare: The Digital Council
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Voice conversations designed for Zimbabwe. 
              <span className="font-semibold text-orange-600"> 75% less data</span>, 
              works on feature phones, creators earn{' '}
              <span className="font-semibold text-orange-600">85%</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <button className="px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-lg flex items-center gap-2">
                  Try Demo Now
                  <ArrowRight size={20} />
                </button>
              </Link>
              <Link href="/rooms">
                <button className="px-8 py-4 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 font-medium text-lg">
                  Browse Rooms
                </button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="text-4xl font-bold text-orange-600 mb-2">75%</div>
              <div className="text-gray-600">Lower data costs vs WhatsApp</div>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="text-4xl font-bold text-orange-600 mb-2">85%</div>
              <div className="text-gray-600">Revenue to creators</div>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="text-4xl font-bold text-orange-600 mb-2">100%</div>
              <div className="text-gray-600">Zimbabwe data residency</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Built for Zimbabwe
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Every feature designed with Zimbabwe's reality in mind: bandwidth constraints, 
            mobile money, local languages, and constitutional rights.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <FeatureCard 
              icon={<Smartphone className="text-orange-600" size={32} />}
              title="Feature Phone Access"
              description="Works via USSD (*447#) on any phone, even Nokia 3310"
            />
            <FeatureCard 
              icon={<Zap className="text-orange-600" size={32} />}
              title="Ultra-Low Bandwidth"
              description="16-64 kbps adaptive streaming saves 75% data vs WhatsApp"
            />
            <FeatureCard 
              icon={<DollarSign className="text-orange-600" size={32} />}
              title="EcoCash Native"
              description="Pay and earn via mobile money. No bank account needed."
            />
            <FeatureCard 
              icon={<Shield className="text-orange-600" size={32} />}
              title="Constitutional Compliance"
              description="Privacy-first, Zimbabwe data residency, Section 57 & 61 compliant"
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How Dare Works
          </h2>
          
          <div className="max-w-4xl mx-auto space-y-12">
            <Step 
              number={1}
              icon={<Users size={24} />}
              title="Register for Free"
              description="Sign up with your phone number. Verify via SMS. Takes 30 seconds."
            />
            <Step 
              number={2}
              icon={<Calendar size={24} />}
              title="Browse Rooms"
              description="Find sessions on agriculture, health, education, news, and entertainment."
            />
            <Step 
              number={3}
              icon={<Mic2 size={24} />}
              title="Join & Learn"
              description="Pay $0.50-2 via EcoCash. Join live voice discussions. Ask questions."
            />
            <Step 
              number={4}
              icon={<DollarSign size={24} />}
              title="Creators Earn"
              description="Hosts receive 85% of revenue. Withdraw anytime to EcoCash. Build audience."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-orange-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Join Dare?
          </h2>
          <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
            This is a prototype for grant applications. Sign up to see the vision 
            and help us build Zimbabwe's voice platform.
          </p>
          <Link href="/register">
            <button className="px-8 py-4 bg-white text-orange-600 rounded-lg hover:bg-gray-100 font-medium text-lg">
              Create Free Account
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-white mb-4">Dare</div>
              <p className="text-sm">
                Voice platform for Zimbabwe. Built with digital ethics at its core.
              </p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/rooms" className="hover:text-white">Browse Rooms</Link></li>
                <li><Link href="/register" className="hover:text-white">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>© 2026 Dare. Built for Zimbabwe, by Zimbabweans.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 bg-gray-50 rounded-lg hover:shadow-lg transition">
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}

function Step({ number, icon, title, description }: { number: number, icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
          {number}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-orange-600">{icon}</div>
          <h3 className="font-bold text-xl">{title}</h3>
        </div>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}
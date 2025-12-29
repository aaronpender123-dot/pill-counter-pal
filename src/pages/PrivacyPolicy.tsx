import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-surface">
      <div className="container max-w-lg mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="bg-card rounded-3xl shadow-card p-6 space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Overview</h2>
            <p className="text-muted-foreground text-sm">
              PillCount ("we", "our", or "the app") is committed to protecting your privacy. 
              This policy explains how we handle your information when you use our pill counting application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Camera Access</h2>
            <p className="text-muted-foreground text-sm">
              PillCount requires access to your device's camera solely to capture images of pills for counting purposes. 
              We do not access your camera for any other reason.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Image Processing</h2>
            <p className="text-muted-foreground text-sm">
              Images you capture are processed in real-time using AI technology to count pills. 
              Images are:
            </p>
            <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1 ml-2">
              <li>Processed temporarily and not permanently stored</li>
              <li>Not shared with third parties for marketing or advertising</li>
              <li>Not used to identify you personally</li>
              <li>Deleted immediately after processing is complete</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Data Collection</h2>
            <p className="text-muted-foreground text-sm">
              PillCount does not collect, store, or share any personal information. We do not:
            </p>
            <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1 ml-2">
              <li>Require account registration</li>
              <li>Track your location</li>
              <li>Store your images on our servers</li>
              <li>Collect health or medical data</li>
              <li>Use cookies or tracking technologies</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Third-Party Services</h2>
            <p className="text-muted-foreground text-sm">
              We use AI services to analyze images and count pills. These services process your images 
              securely and do not retain your data after processing is complete.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Children's Privacy</h2>
            <p className="text-muted-foreground text-sm">
              PillCount is not intended for use by children under 13 years of age. 
              We do not knowingly collect information from children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Changes to This Policy</h2>
            <p className="text-muted-foreground text-sm">
              We may update this privacy policy from time to time. We will notify you of any changes 
              by posting the new policy on this page.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Contact Us</h2>
            <p className="text-muted-foreground text-sm">
              If you have any questions about this Privacy Policy, please contact us at: 
              support@pillcount.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

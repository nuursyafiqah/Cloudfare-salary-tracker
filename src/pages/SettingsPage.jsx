import { HelpCircle, Info } from "lucide-react";
import MobileLayout from "../components/MobileLayout";

export default function SettingsPage() {
  return (
    <MobileLayout>
      <div className="space-y-6 pb-4">
        <h1 className="text-xl font-bold">Settings {"&"} Help</h1>

        <div className="bg-primary/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">How This Works</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>This tracker follows your <strong>salary date</strong>, not the calendar month.</p>
            <p>Each time you receive salary, start a <strong>new salary cycle</strong> with the received date and amount.</p>
            <p>Record your <strong>fixed spending</strong> (rent, loans, etc.) and <strong>daily expenses</strong> within the cycle.</p>
            <p>When you create a new cycle, the previous one automatically closes. Fixed items marked as repeat will be copied over.</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><HelpCircle className="w-4 h-4" /> FAQ</h3>
          <div className="space-y-3 text-sm">
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="font-medium">Why salary cycle, not monthly?</p>
              <p className="text-muted-foreground mt-1">Because your salary date can change each month, and your salary amount may vary due to OT or bonuses.</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="font-medium">What if I don{"'"}t know my next salary date?</p>
              <p className="text-muted-foreground mt-1">Leave the end date empty. Your cycle stays active until you create the next one.</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="font-medium">What is repeat every cycle?</p>
              <p className="text-muted-foreground mt-1">Fixed spending items marked as repeat will be automatically copied when you create a new salary cycle.</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <p className="font-medium">Do users need to log in?</p>
              <p className="text-muted-foreground mt-1">No. This public-link version can be opened and edited by anyone who has the website link.</p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

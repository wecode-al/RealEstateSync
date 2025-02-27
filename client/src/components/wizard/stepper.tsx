import { Check } from "lucide-react";

export interface StepProps {
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: StepProps[];
  currentStep: number;
}

export function Step({ 
  step, 
  index, 
  currentStep,
  stepsCount 
}: { 
  step: StepProps; 
  index: number; 
  currentStep: number;
  stepsCount: number;
}) {
  const isCompleted = currentStep > index;
  const isCurrent = currentStep === index;

  return (
    <div className="flex items-start">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
            isCompleted 
              ? "bg-primary border-primary text-primary-foreground" 
              : isCurrent 
                ? "border-primary text-primary" 
                : "border-muted-foreground text-muted-foreground"
          }`}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" />
          ) : (
            <span>{index + 1}</span>
          )}
        </div>
        {index < (stepsCount - 1) && (
          <div className={`h-10 w-0.5 ${
            isCompleted ? "bg-primary" : "bg-muted-foreground/20"
          }`} />
        )}
      </div>
      <div className="ml-4 pb-8">
        <p className={`font-medium ${
          isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
        }`}>
          {step.title}
        </p>
        {step.description && (
          <p className="text-sm text-muted-foreground">
            {step.description}
          </p>
        )}
      </div>
    </div>
  );
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, index) => (
        <Step 
          key={index} 
          step={step} 
          index={index} 
          currentStep={currentStep}
          stepsCount={steps.length}
        />
      ))}
    </div>
  );
}
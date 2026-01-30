import { Check, X } from 'lucide-react';
import { checkPasswordStrength, getStrengthLabel, PASSWORD_MIN_LENGTH } from '@/lib/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = checkPasswordStrength(password);
  const { label, color } = getStrengthLabel(strength.score);

  if (!password) return null;

  const requirements = [
    { key: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: strength.length },
    { key: 'uppercase', label: 'One uppercase letter', met: strength.uppercase },
    { key: 'lowercase', label: 'One lowercase letter', met: strength.lowercase },
    { key: 'number', label: 'One number', met: strength.number },
    { key: 'special', label: 'One special character (!@#$%...)', met: strength.special },
  ];

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={strength.score === 5 ? 'text-green-500' : 'text-muted-foreground'}>
            {label}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${color}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1">
        {requirements.map((req) => (
          <li
            key={req.key}
            className={`flex items-center gap-2 text-xs transition-colors ${
              req.met ? 'text-green-500' : 'text-muted-foreground'
            }`}
          >
            {req.met ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

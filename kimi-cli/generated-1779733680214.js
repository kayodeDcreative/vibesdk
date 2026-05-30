```typescript
import validator from 'validator';

export const isValidEmail = (email: string): boolean => {
  return validator.isEmail(email);
};
```
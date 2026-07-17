"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
  UseFormReturn,
} from "react-hook-form";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  className?: string;
  children?: React.ReactNode;
}

const Form = <TFieldValues extends FieldValues = FieldValues>({
  form,
  onSubmit,
  className,
  children,
  ...props
}: FormProps<TFieldValues>) => (
  <FormProvider {...form}>
    <form
      data-slot="Form"
      onSubmit={onSubmit}
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      {children}
    </form>
  </FormProvider>
);

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

const FormItem = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="FormItem"
        className={cn("flex flex-col gap-1", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
};

const FormControl = ({ ...props }: React.ComponentProps<typeof Slot>) => {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <Slot
      data-slot="FormControl"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
};

const FormDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="FormDescription"
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
};

const FormMessage = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) return null;

  return (
    <p
      data-slot="FormMessage"
      id={formMessageId}
      className={cn(
        "text-sm leading-none font-medium text-destructive",
        className,
      )}
      {...props}
    >
      {body}
    </p>
  );
};

const FormLabel = ({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) => {
  const { formItemId } = useFormField();

  return (
    <div className="flex flex-row items-baseline gap-2">
      <Label
        data-slot="FormLabel"
        className={cn(className)}
        htmlFor={formItemId}
        {...props}
      />
      <FormMessage />
    </div>
  );
};

const FormRadioGroup = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root> & {
  onChange?: (value: string) => void;
  value?: string;
}) => {
  return (
    <RadioGroupPrimitive.Root
      data-slot="FormRadioGroup"
      className={cn("grid gap-2", className)}
      onValueChange={props.onChange}
      defaultValue={props.value}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Root>
  );
};

const radioItemVariants = cva(
  "flex h-9 flex-row items-center justify-center rounded-md border-2 text-lg font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-primary has-checked:bg-primary has-checked:text-primary-foreground",
        destructive:
          "border-destructive has-checked:bg-destructive has-checked:text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const FormRadioItem = ({
  children,
  variant,
  className,
  value,
  id,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> &
  VariantProps<typeof radioItemVariants>) => (
  <FormItem>
    <Label
      htmlFor={id}
      className={cn(radioItemVariants({ variant }), className)}
    >
      <FormControl>
        <RadioGroupPrimitive.Item
          data-slot="FormRadioItem"
          id={id}
          value={value}
          className="sr-only"
          {...props}
        />
      </FormControl>
      {children}
    </Label>
  </FormItem>
);

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  FormRadioGroup,
  FormRadioItem,
};

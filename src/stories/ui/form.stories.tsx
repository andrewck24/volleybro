import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const meta = {
  title: "Design System/Molecules/Form",
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function FormExample() {
    const form = useForm<{ name: string; email: string }>({
      defaultValues: { name: "", email: "" },
    });

    return (
      <Form form={form} onSubmit={form.handleSubmit(fn())} className="w-80">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} />
              </FormControl>
              <FormDescription>Your display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Submit
        </Button>
      </Form>
    );
  },
};

export const WithValidation: Story = {
  render: function FormWithValidation() {
    const form = useForm<{ username: string }>({
      defaultValues: { username: "" },
    });

    return (
      <Form
        form={form}
        onSubmit={form.handleSubmit(fn())}
        className="w-80"
      >
        <FormField
          control={form.control}
          name="username"
          rules={{ required: "Username is required", minLength: { value: 3, message: "At least 3 characters" } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Submit
        </Button>
      </Form>
    );
  },
};

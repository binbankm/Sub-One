# shadcn-ui Migration Guide

This project has been migrated to use shadcn-ui/shadcn-vue components.

## Available Components

### Core Components

All components are located in `src/components/ui/` and can be imported as follows:

```vue
<script setup>
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
</script>
```

### Button Usage

Replace old button classes with the shadcn-ui Button component:

**Before:**
```vue
<button class="btn-modern">Click me</button>
<button class="btn-add">Add</button>
<button class="btn-danger">Delete</button>
```

**After:**
```vue
<Button>Click me</Button>
<Button variant="default">Add</Button>
<Button variant="destructive">Delete</Button>
```

**Available Button Variants:**
- `default` - Primary button with gradient
- `destructive` - Danger/delete actions
- `outline` - Outlined button
- `secondary` - Secondary actions
- `ghost` - Minimal button
- `link` - Link-styled button

**Available Button Sizes:**
- `default` - Standard size
- `sm` - Small
- `lg` - Large
- `icon` - Icon-only button

### Dialog/Modal Usage

The BaseModal component now uses shadcn-ui Dialog internally, so all existing modals automatically benefit from shadcn-ui styling.

**Custom Dialog Example:**
```vue
<template>
  <Dialog v-model:open="isOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Description</DialogDescription>
      </DialogHeader>
      
      <div>
        <!-- Your content -->
      </div>
      
      <DialogFooter>
        <Button variant="outline" @click="isOpen = false">Cancel</Button>
        <Button @click="handleConfirm">Confirm</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
```

### Form Inputs

**Input Field:**
```vue
<Label for="email">Email</Label>
<Input 
  id="email" 
  v-model="email" 
  type="email" 
  placeholder="Enter email"
/>
```

**Textarea:**
```vue
<Label for="message">Message</Label>
<Textarea 
  id="message" 
  v-model="message" 
  placeholder="Enter message"
/>
```

### Card Usage

```vue
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    <!-- Content -->
  </CardContent>
  <CardFooter>
    <!-- Footer actions -->
  </CardFooter>
</Card>
```

### Badge Usage

```vue
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### Tabs Usage

```vue
<Tabs default-value="tab1" v-model="activeTab">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  
  <TabsContent value="tab1">
    Content for tab 1
  </TabsContent>
  
  <TabsContent value="tab2">
    Content for tab 2
  </TabsContent>
</Tabs>
```

## CSS Variables

All shadcn-ui components use CSS variables defined in `src/assets/styles/main.css`:

```css
--color-background
--color-foreground
--color-primary
--color-secondary
--color-muted
--color-accent
--color-destructive
--color-border
--color-input
--color-ring
```

These variables automatically adapt to dark mode.

## Utilities

The `cn()` utility function is available for merging class names:

```ts
import { cn } from '@/lib/utils';

const className = cn('base-class', condition && 'conditional-class', props.class);
```

## Migration Checklist

- [x] Install shadcn-vue dependencies
- [x] Create core components (Button, Dialog, Input, Label, Card, Badge, Textarea, Tabs)
- [x] Update BaseModal to use Dialog
- [x] Add CSS design tokens
- [x] Add dark mode support
- [ ] Update feature components to use shadcn-ui components
- [ ] Replace custom button classes with Button component
- [ ] Replace form inputs with Input/Label components
- [ ] Test all functionality

## Resources

- [shadcn-vue Documentation](https://www.shadcn-vue.com/)
- [Radix Vue](https://www.radix-vue.com/)
- [Tailwind CSS](https://tailwindcss.com/)

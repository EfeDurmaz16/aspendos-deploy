/**
 * Button Component Tests
 *
 * Simple tests to verify Vitest and React Testing Library setup.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
    it('should render button with text', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render button with primary variant by default', () => {
        render(<Button>Primary Button</Button>);
        const button = screen.getByText('Primary Button');
        expect(button).toHaveClass('bg-primary');
    });

    it('should render button with secondary variant', () => {
        render(<Button variant="secondary">Secondary Button</Button>);
        const button = screen.getByText('Secondary Button');
        expect(button).toHaveClass('bg-background');
    });

    it('should render button with danger variant', () => {
        render(<Button variant="danger">Delete</Button>);
        const button = screen.getByText('Delete');
        expect(button).toHaveClass('bg-destructive');
    });

    it('should render button with small size', () => {
        render(<Button size="sm">Small Button</Button>);
        const button = screen.getByText('Small Button');
        expect(button).toHaveClass('h-9');
    });

    it('should render button with large size', () => {
        render(<Button size="lg">Large Button</Button>);
        const button = screen.getByText('Large Button');
        expect(button).toHaveClass('h-12');
    });

    it('should be disabled when disabled prop is passed', () => {
        render(<Button disabled>Disabled Button</Button>);
        const button = screen.getByText('Disabled Button');
        expect(button).toBeDisabled();
    });
});

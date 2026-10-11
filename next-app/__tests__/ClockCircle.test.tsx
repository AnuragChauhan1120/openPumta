import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ClockCircle from '../app/components/pomodoro/ClockCircle';

describe('ClockCircle', () => {
  it('renders with aspect-square and shrink-0 to prevent non-round distortion in flex layouts', () => {
    const { container } = render(
      <ClockCircle size="lg" percent={50}>
        <span>25:00</span>
      </ClockCircle>,
    );

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).not.toBeNull();
    expect(rootDiv.className).toContain('aspect-square');
    expect(rootDiv.className).toContain('shrink-0');
    expect(rootDiv.className).toContain('max-w-[48rem]');
    expect(rootDiv.className).toContain('max-h-[48rem]');
  });

  it('renders small size with aspect-square and shrink-0', () => {
    const { container } = render(
      <ClockCircle size="sm" percent={25}>
        <span>05:00</span>
      </ClockCircle>,
    );

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).not.toBeNull();
    expect(rootDiv.className).toContain('aspect-square');
    expect(rootDiv.className).toContain('shrink-0');
  });
});

/**
 * Hard-coded list of dating app prompts (like Hinge)
 * Users can select 1-3 prompts to answer
 */

export interface PromptOption {
  id: string;
  question: string;
}

export const AVAILABLE_PROMPTS: PromptOption[] = [
  {
    id: 'p1',
    question: 'I\'m looking for',
  },
  {
    id: 'p2',
    question: 'My simple pleasures',
  },
  {
    id: 'p3',
    question: 'I\'m a great +1 because',
  },
  {
    id: 'p4',
    question: 'The way to my heart is',
  },
  {
    id: 'p5',
    question: 'I\'ll fall for you if',
  },
  {
    id: 'p6',
    question: 'I\'m weirdly attracted to',
  },
  {
    id: 'p7',
    question: 'My most irrational fear',
  },
  {
    id: 'p8',
    question: 'I\'ll know I\'ve found the one when',
  },
  {
    id: 'p9',
    question: 'My ideal first date',
  },
  {
    id: 'p10',
    question: 'I\'m the type of person who',
  },
];

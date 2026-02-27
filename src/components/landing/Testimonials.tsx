import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "We've been together 8 years and discovered things about each other we never knew. Game changer.",
    author: "Sarah & Mike",
  },
  {
    quote: "I was nervous to bring up certain topics. This made it easy — and fun.",
    author: "Jordan",
  },
  {
    quote: "The privacy feature is genius. I felt safe being honest.",
    author: "Anonymous user",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-32 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Couples are talking
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative p-6 rounded-2xl bg-background border border-border/50"
            >
              <Quote className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
              <blockquote className="text-foreground mb-4 relative z-10">
                &quot;{testimonial.quote}&quot;
              </blockquote>
              <cite className="text-sm text-muted-foreground not-italic">
                — {testimonial.author}
              </cite>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

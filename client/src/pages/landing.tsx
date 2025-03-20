import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Logo from "@/components/ui/logo";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Apple, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { SiFacebook, SiGithub, SiInstagram, SiLinkedin } from "react-icons/si";
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Icon from "@/components/Icon";
import Star from "@/components/Star";
import { TermsDialog, PrivacyDialog, CookieDialog } from "@/components/policy-dialogs";
import { ContactDialog } from "@/components/policy-dialogs"; // Import the ContactDialog component


const habitFacts = [
  {
    title: "21 Days Myth",
    description: "While popular belief suggests it takes 21 days to form a habit, research shows it can take anywhere from 18 to 254 days, with an average of 66 days for a new behavior to become automatic.",
    icon: "Brain",
    color: "text-violet-500"
  },
  {
    title: "Success Rate",
    description: "People who track their habits are 42% more likely to achieve their goals compared to those who don't track their progress.",
    icon: "LineChart",
    color: "text-blue-500"
  },
  {
    title: "Habit Stacking",
    description: "Linking a new habit to an existing one increases your success rate by 75%. This technique is called habit stacking.",
    icon: "Layers",
    color: "text-green-500"
  },
  {
    title: "Time of Day",
    description: "Morning habits have an 85% higher success rate due to higher willpower and fewer distractions earlier in the day.",
    icon: "Sunrise",
    color: "text-orange-500"
  }
];

const testimonials = [
  {
    name: "Sarah J.",
    role: "Fitness Enthusiast",
    image: "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&q=80&w=200&h=200",
    quote: "Habitizr transformed my fitness journey! The SMS reminders keep me accountable, and the AI feedback feels like having a personal coach.",
    rating: 5,
    streakDays: 120,
    achievements: ["90-Day Streak", "Early Bird", "Perfect Week"],
    habitCount: 5
  },
  {
    name: "Michael R.",
    role: "Software Developer",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200",
    quote: "I've tried many habit tracking apps, but none stuck until Habitizr. The intuitive design and smart notifications make it effortless to maintain good habits.",
    rating: 5,
    streakDays: 85,
    achievements: ["Habit Master", "Night Owl", "Quick Starter"],
    habitCount: 7
  },
  {
    name: "Emily L.",
    role: "Healthcare Professional",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200&h=200",
    quote: "The science-backed approach really sets Habitizr apart. I love how it adapts to my progress and provides personalized suggestions.",
    rating: 4,
    streakDays: 60,
    achievements: ["Consistency King", "Feedback Pro", "Goal Crusher"],
    habitCount: 4
  },
  {
    name: "David K.",
    role: "Student",
    image: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200&h=200",
    quote: "As a student, maintaining productive habits was challenging. Habitizr helped me create a study routine that actually sticks!",
    rating: 5,
    streakDays: 45,
    achievements: ["Rising Star", "Study Champion", "Focus Master"],
    habitCount: 3
  }
];

const smsStats = [
  {
    title: "98% Open Rate",
    description: "SMS messages have a 98% open rate compared to just 20% for app notifications, ensuring your habit reminders are actually seen.",
  },
  {
    title: "90 Second Response",
    description: "The average response time for SMS is just 90 seconds, compared to 90 minutes for email and hours for app notifications.",
  },
  {
    title: "45% Response Rate",
    description: "SMS messages have a 45% response rate, while push notifications typically see less than 2% engagement.",
  }
];

const Landing = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [testimonialRef, testimonialApi] = useEmblaCarousel({
    loop: true,
    dragFree: true
  });

  useEffect(() => {
    if (testimonialApi) {
      const testimonialInterval = setInterval(() => {
        testimonialApi.scrollNext();
      }, 5000);
      return () => clearInterval(testimonialInterval);
    }
  }, [testimonialApi]);

  useEffect(() => {
    if (emblaApi) {
      const scienceInterval = setInterval(() => {
        emblaApi.scrollNext();
      }, 8000);
      return () => clearInterval(scienceInterval);
    }
  }, [emblaApi]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <div className="min-h-screen gradient-bg">
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-200 bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="gap-2 font-medium text-lg px-6 py-6"
              onClick={() => {
                toast({
                  title: "Coming Soon!",
                  description: "The iOS app is currently in development.",
                })
              }}
            >
              <Apple className="h-8 w-8" />
              App Store
            </Button>
            <Button
              variant="outline"
              className="gap-2 font-medium text-lg px-6 py-6"
              onClick={() => {
                toast({
                  title: "Coming Soon!",
                  description: "The Android app is currently in development.",
                })
              }}
            >
              <Play className="h-8 w-8" />
              Play Store
            </Button>
            <Link href="/auth">
              <Button variant="outline" className="font-medium text-lg px-6 py-6">Login</Button>
            </Link>
          </div>
        </div>
      </nav>
      <div className="h-16"></div>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-12"
            >
              <div className="space-y-6">
              <h2 className="text-5xl md:text-7xl font-black bg-clip-text text-[#257aab] tracking-tight leading-[1.1]">
  Transform Your Life Through Better Habits
</h2>

                <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-200 leading-relaxed font-medium">
                  Whether you're looking to build positive habits or break free from negative ones,
                  Habitizr helps you achieve lasting change with AI-powered SMS tracking.
                </p>
              </div>
              <div className="space-y-8">
                <div className="flex items-center gap-4 bg-white/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                  <CheckCircle2 className="text-primary h-6 w-6 shrink-0" />
                  <span className="text-xl text-gray-900 dark:text-gray-100 leading-relaxed font-semibold">Build positive habits: exercise, reading, meditation</span>
                </div>
                <div className="flex items-center gap-4 bg-white/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                  <CheckCircle2 className="text-primary h-6 w-6 mt-1 shrink-0" />
                  <span className="text-lg text-gray-900 dark:text-gray-100 leading-relaxed">Break negative patterns: smoking, procrastination</span>
                </div>
                <div className="flex items-start gap-4 bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors">
                  <CheckCircle2 className="text-primary h-6 w-6 mt-1 shrink-0" />
                  <span className="text-lg text-gray-900 dark:text-gray-100 leading-relaxed">AI-powered progress tracking and insights</span>
                </div>
              </div>
              <div className="flex justify-center mt-12">
                <Link href="/auth">
                  <Button size="lg" className="btn-gradient px-8 py-6 text-lg font-semibold">
                    Start Free Today
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="section-card overflow-hidden rounded-2xl border border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src="/attached_assets/pexels-tima-miroshnichenko-6670748.jpg"
                  alt="Person working on computer"
                  className="w-full h-[calc(100vh_-_400px)] object-cover"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-gradient-to-b from-blue-50/50 to-white/50">
          <div className="container mx-auto px-6">
            <h3 className="text-3xl font-bold text-center mb-16 tracking-tight">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                {
                  title: "Set Your Goals",
                  description: "Choose habits to build or break, set your schedule",
                  image: "/attached_assets/pexels-ivan-samkov-4240497.jpg"
                },
                {
                  title: "Get Daily Check-ins",
                  description: "Receive personalized SMS reminders and respond naturally",
                  image: "/attached_assets/pexels-tima-miroshnichenko-6671692.jpg"
                },
                {
                  title: "Track Progress",
                  description: "Our AI analyzes your responses and adapts to help you succeed",
                  image: "/attached_assets/pexels-yankrukov-6815686.jpg"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="section-card p-8 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="h-48 mb-6 rounded-xl overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-2xl font-semibold mb-4 tracking-tight">{item.title}</h4>
                  <p className="text-lg text-gray-900 dark:text-gray-100 leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SMS Stats Section */}
        <section className="py-24 bg-gradient-to-b from-white/50 to-blue-50/50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-6 tracking-tight">
                Why SMS Works Better
              </h2>
              <p className="text-xl text-gray-900 dark:text-gray-100 max-w-3xl mx-auto font-medium leading-relaxed tracking-normal">
                In today's notification-saturated world, SMS stands out as the most effective way to build habits. Here's why:
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {smsStats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="section-card p-8"
                >
                  <h3 className="text-3xl font-bold text-primary mb-4 tracking-tight">{stat.title}</h3>
                  <p className="text-lg text-gray-900 dark:text-gray-100 font-medium leading-relaxed">{stat.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="section-card"
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="detailed-benefits" className="bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors duration-200">
                  <AccordionTrigger className="px-8 py-6 hover:no-underline group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-semibold tracking-tight text-primary group-hover:text-primary/80 transition-colors">
                        See All Benefits of SMS-Based Habit Tracking
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                      <div>
                        <h4 className="font-semibold text-xl mb-4 text-primary tracking-tight">Instant Accessibility</h4>
                        <ul className="space-y-3 text-gray-900 dark:text-gray-100 leading-relaxed">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-lg">Works instantly on any phone - no app downloads needed</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-lg">Reliable delivery even without internet connection</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-lg">Start building habits immediately without setup</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-xl mb-4 text-primary tracking-tight">Proven Engagement</h4>
                        <ul className="space-y-3 text-gray-900 dark:text-gray-100 leading-relaxed">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-lg">98% of SMS messages are read within 3 minutes</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-lg">45% response rate vs. 2% for app notifications</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-lg">Direct inbox delivery ensures you never miss a check-in</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-xl mb-4 text-primary tracking-tight">Better Results</h4>
                        <ul className="space-y-3 text-gray-900 dark:text-gray-100 leading-relaxed">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-lg">No notification fatigue or app distractions</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-lg">Natural, conversation-like interaction</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-lg">42% higher habit completion rate vs. traditional apps</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="text-center mt-12"
            >
              <Link href="/auth">
                <Button size="lg" className="btn-gradient px-8 py-6 text-lg font-semibold">
                  Start Building Better Habits
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Science Section - Grid Layout */}
        <section className="py-24 bg-gradient-to-b from-white/50 to-blue-50/50">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent tracking-tight">
              The Science of Habit Formation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {habitFacts.map((fact, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="section-card p-8 flex flex-col items-center text-center"
                >
                  <div className={`mb-6 ${fact.color}`}>
                    <Icon name={fact.icon} className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent tracking-tight">
                    {fact.title}
                  </h3>
                  <p className="text-lg text-gray-900 dark:text-gray-100 leading-relaxed font-medium tracking-normal">
                    {fact.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section - Enhanced Cards */}
        <section className="py-24 bg-gradient-to-b from-blue-50/50 to-white/50">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent tracking-tight">
              Success Stories
            </h2>

            <div className="overflow-hidden" ref={testimonialRef}>
              <div className="flex">
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex-[0_0_100%] min-w-0 relative px-4"
                  >
                    <div className="section-card p-8 md:p-12">
                      <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full overflow-hidden mb-6">
                            <img
                              src={testimonial.image}
                              alt={testimonial.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute -bottom-2 -right-2 bg-primary text-white text-sm font-bold rounded-full px-2 py-1">
                            {testimonial.streakDays}d
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 ${
                                i < testimonial.rating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-xl md:text-2xl text-gray-900 dark:text-gray-100 mb-6 italic font-medium leading-relaxed tracking-normal">
                          "{testimonial.quote}"
                        </p>

                        <h4 className="font-semibold text-lg tracking-tight">{testimonial.name}</h4>
                        <p className="text-gray-900 dark:text-gray-100 mb-4 font-medium leading-relaxed tracking-normal">{testimonial.role}</p>

                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                          {testimonial.achievements.map((achievement, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                            >
                              {achievement}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed tracking-normal">
                          Tracking {testimonial.habitCount} habits
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="text-center mt-16">
              <Link href="/auth">
                <Button size="lg" className="btn-gradient scale-125 py-6 text-lg font-semibold">
                  Join Them Today
                </Button>
              </Link>
            </div>
          </div>
        </section>


        {/* Footer */}
        <footer className="mt-24 bg-background border-t">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-base text-gray-700 dark:text-gray-300 font-medium leading-relaxed tracking-normal">
                &copy; {new Date().getFullYear()} Habitizr. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <PrivacyDialog trigger={
                  <span className="text-base text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary font-medium leading-relaxed tracking-normal cursor-pointer">
                    Privacy Policy
                  </span>
                } />
                <TermsDialog trigger={
                  <span className="text-base text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary font-medium leading-relaxed tracking-normal cursor-pointer">
                    Terms of Service
                  </span>
                } />
                <CookieDialog trigger={
                  <span className="text-base text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary font-medium leading-relaxed tracking-normal cursor-pointer">
                    Cookie Policy
                  </span>
                } />
                <ContactDialog trigger={
                  <span className="text-base text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary font-medium cursor-pointer">
                    Contact
                  </span>
                } />
              </div>
            </div>

            <div className="mt-8 pt-8 border-t">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    className="gap-2 hover:bg-primary/5 font-medium text-lg px-6 py-6"
                    onClick={() => {
                      toast({
                        title: "Coming Soon!",
                        description: "The iOS app is currently in development.",
                      })
                    }}
                  >
                    <Apple className="h-8 w-8" />
                    App Store
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 hover:bg-primary/5 font-medium text-lg px-6 py-6"
                    onClick={() => {
                      toast({
                        title: "Coming Soon!",
                        description: "The Android app is currently in development.",
                      })
                    }}
                  >
                    <Play className="h-8 w-8" />
                    Play Store
                  </Button>
                </div>

                <div className="flex items-center gap-6">
                  <a href="#" className="text-gray-600 hover:text-primary transition-colors duration-200 dark:text-gray-400 dark:hover:text-primary">
                    <SiFacebook className="h-6 w-6" />
                  </a>
                  <a href="#" className="text-gray-600 hover:text-primary transition-colors duration-200 dark:text-gray-400 dark:hover:text-primary">
                    <SiGithub className="h-6 w-6" />
                  </a>
                  <a href="#" className="text-gray-600 hover:text-primary transition-colors duration-200 dark:text-gray-400 dark:hover:text-primary">
                    <SiInstagram className="h-6 w-6" />
                  </a>
                  <a href="#" className="text-gray-600 hover:text-primary transition-colors duration-200 dark:text-gray-400 dark:hover:text-primary">
                    <SiLinkedin className="h-6 w-6" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Landing;
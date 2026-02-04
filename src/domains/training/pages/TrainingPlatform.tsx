import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, Trophy, TrendingUp, PlayCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/domains/shared/hooks/use-toast";

export default function TrainingPlatform() {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['training-courses'],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from('training_courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from('training_enrollments')
        .select(`
          *,
          training_courses (*)
        `)
        .order('enrolled_at', { ascending: false });
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const { data: certifications } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from('training_certifications')
        .select(`
          *,
          training_courses (title)
        `)
        .order('issued_at', { ascending: false });
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const { data: recommendations } = useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: async () => {
      const { user } = useAuth();
      if (!user) return [];
      
      const result = await apiClient.functions.invoke('training-ai-recommend', {
        body: { userId: user.id }
      });
      
      if (error) {
        console.error('AI recommendations error:', error);
        return [];
      }
      return result.data?.recommendations || [];
    },
  });

  const handleEnroll = async (courseId: string) => {
    try {
      const result = await apiClient.functions.invoke('training-course-manager', {
        body: { action: 'enroll', courseId }
      });
      
      if (result.error) throw result.error;
      
      toast({
        title: "Enrolled Successfully",
        description: "You can now start learning!",
      });
    } catch (error) {
      toast({
        title: "Enrollment Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training & Certification Platform</h1>
          <p className="text-muted-foreground">Upskill, learn, and earn certifications</p>
        </div>
        <div className="flex gap-4">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="text-sm font-medium">{certifications?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Certificates</div>
              </div>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm font-medium">{enrollments?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Enrolled</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList>
          <TabsTrigger value="browse">Browse Courses</TabsTrigger>
          <TabsTrigger value="my-learning">My Learning</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coursesLoading ? (
              <div>Loading courses...</div>
            ) : courses?.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={
                      course.difficulty_level === 'beginner' ? 'secondary' :
                      course.difficulty_level === 'intermediate' ? 'default' : 'destructive'
                    }>
                      {course.difficulty_level}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{course.duration_minutes}min</span>
                  </div>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <GraduationCap className="w-4 h-4 inline mr-1" />
                      {course.instructor_name}
                    </div>
                    <Button size="sm" onClick={() => handleEnroll(course.id)}>
                      Enroll
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-learning" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments?.map((enrollment: any) => (
              <Card key={enrollment.id}>
                <CardHeader>
                  <CardTitle>{enrollment.training_courses.title}</CardTitle>
                  <CardDescription>
                    Progress: {enrollment.progress_percent}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${enrollment.progress_percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {enrollment.completed_at ? (
                          <><CheckCircle2 className="w-4 h-4 inline text-green-500" /> Completed</>
                        ) : (
                          'In Progress'
                        )}
                      </span>
                      <Button size="sm" variant="outline">
                        <PlayCircle className="w-4 h-4 mr-1" />
                        Continue
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certifications?.map((cert: any) => (
              <Card key={cert.id} className="border-2 border-yellow-500/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <CardTitle className="text-lg">{cert.training_courses?.title}</CardTitle>
                  </div>
                  <CardDescription>
                    Certificate #{cert.certificate_number}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Issued:</span>{' '}
                      {new Date(cert.issued_at).toLocaleDateString()}
                    </div>
                    {cert.expires_at && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Expires:</span>{' '}
                        {new Date(cert.expires_at).toLocaleDateString()}
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="w-full">
                      View Certificate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">AI-Powered Recommendations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations?.map((rec: any) => {
              const course = courses?.find(c => c.id === rec.course_id);
              if (!course) return null;
              return (
                <Card key={rec.course_id} className="border-l-4 border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <Badge>Priority {rec.priority}</Badge>
                    </div>
                    <CardDescription>{rec.reason}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm" onClick={() => handleEnroll(rec.course_id)}>
                      Enroll Now
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

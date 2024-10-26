#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

typedef unsigned char rand_type;
rand_type my_rand() {
  char buff[sizeof(rand_type)];
  for (size_t i = 0 ; i < sizeof(rand_type) ; ++i) {
    buff[i] = (char) rand();
  }
  return *(rand_type *) buff;
}

int print_file(char* filename) {
  FILE *file_ptr;
  char ch;
  file_ptr = fopen(filename, "r");
  if (NULL == file_ptr) {
    fprintf(stderr, "file can't be opened: %s\n", filename);
    return 1;
  }
  printf("CONTENTS OF %s:\n", filename);
  fflush(stdout);
  while ((ch = fgetc(file_ptr)) != EOF) {
    printf("%c", ch);
  }
  fclose(file_ptr);
  return 0;
}

int main(int argc, char *argv[]) {
  printf("hello. argv works: %d\n", argc);
  for (int i=0;i<argc;i++) {
    printf("  %d: %s\n", i, argv[i]);
  }
  fflush(stdout);

  printf("env works:\n");
  const char* COOL = getenv("COOL");
  printf("  COOL=%s\n", COOL);
  fflush(stdout);

  printf("stdout works.\n");
  fflush(stdout);
  fprintf(stderr, "stderr works.\n");
  fflush(stderr);

  time_t rawtime;
  struct tm *info;
  time(&rawtime);
  info = localtime(&rawtime);
  printf("time works: %s", asctime(info));
  fflush(stdout);

  srand(time(NULL));
  printf("random works: %hhu\n", my_rand());
  fflush(stdout);

  printf ("I can read files from zip:\n");
  fflush(stdout);
  char* filename = "/zip/cyber.txt";
  if (access(filename, F_OK) == 0) {
    printf("file exists: %s\n", filename);
    print_file(filename);
    fflush(stdout);
    return 1;
  } else {
    fprintf(stderr, "file does not exist: %s\n", filename);
    fflush(stderr);
  }

  return 0;
}
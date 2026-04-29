// rectangle.h

#ifndef RECTANGLE_H
#define RECTANGLE_H

class Rectangle {  
    private:
        double width;
        double length;

public:
     double getWidth()  {
        return this->width;
      }
     double getLength()  {
    return this->length;
     }
    double getArea() 
    {
    double are = length * width;
    return are;  
    }
    void setWidth(double w) {
                width = w;
    }
  void setLength(double l) {
                length = l;
    }
 void drawrectangle() {
    std::string pixel = "🤖";
    for (int i = 0; i < length; i++) {
        for (int j = 0; j < width; j++) {
            std::cout << pixel;
        }
        std::cout << std::endl;
        }
    }
    
};





            

#endif // RECTANGLE_H